import { useEffect, useState } from 'react'
import {
  CATEGORIES,
  formatHMS,
  startOfDay,
  totalsBetween,
  type TimerState
} from '../../../shared/timer'
import { CATEGORY_LABEL, CATEGORY_READY, TEXT, headline } from '../../../shared/labels'
import { IconAnalog, IconDigital, IconPin } from '../components/Icons'
import { Lcd } from '../components/Lcd'
import { TimerControls } from '../components/TimerControls'
import { useSelection } from '../hooks'
import { nextDay } from '../../../shared/stats'
import { StatsView } from './StatsView'
import { SettingsView } from './SettingsView'
import type { Settings } from '../../../shared/settings'

/** 이 창을 항상 위에 띄우기 토글. */
function PinButton(): React.JSX.Element {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    window.api.getAlwaysOnTop().then(setPinned)
  }, [])
  return (
    <button
      className={`nub ${pinned ? 'is-on' : ''}`}
      title={pinned ? TEXT.pinOff : TEXT.pinOn}
      aria-pressed={pinned}
      onClick={() => window.api.setAlwaysOnTop(!pinned).then(setPinned)}
    >
      <IconPin />
    </button>
  )
}

type Tab = 'timer' | 'stats' | 'settings'

export function MainView({
  state,
  settings,
  now
}: {
  state: TimerState
  settings: Settings
  now: number
}): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('timer')
  const tabs: Array<[Tab, string]> = [
    ['timer', TEXT.tabTimer],
    ['stats', TEXT.tabStats],
    ['settings', TEXT.tabSettings]
  ]
  const collapsed = settings.reportCollapsed
  const selection = useSelection(state)
  const { selected } = selection
  const active = state.active
  const today = startOfDay(now)
  const totals = totalsBetween(state, today, nextDay(today), now)
  const longest = Math.max(...CATEGORIES.map((c) => totals[c]))

  return (
    <main className="device">
      <header className="device-top">
        <div className="tabs" role="tablist">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'is-on' : ''}
              onClick={() => setTab(t)}
            >
              {label}
            </button>
          ))}
        </div>
        <nav className="nubs">
          <button
            className="nub"
            title={TEXT.toDigital}
            onClick={() => window.api.openView('digital')}
          >
            <IconDigital />
          </button>
          <button
            className="nub"
            title={TEXT.toAnalog}
            onClick={() => window.api.openView('analog')}
          >
            <IconAnalog />
          </button>
          <PinButton />
        </nav>
      </header>

      {tab === 'stats' ? (
        <StatsView state={state} now={now} />
      ) : tab === 'settings' ? (
        <SettingsView settings={settings} />
      ) : (
        <>
          <Lcd
            label={headline(active, selected)}
            time={formatHMS(active ? now - active.startedAt : 0)}
            note={active && selected ? TEXT.nextUp(CATEGORY_READY[selected]) : undefined}
          />

          <TimerControls active={active} selection={selection} />

          <section className={collapsed ? 'report is-collapsed' : 'report'}>
            <div className="report-head">
              <h2>{TEXT.today}</h2>
              <button
                className="fold"
                aria-expanded={!collapsed}
                onClick={() => window.api.setSettings({ reportCollapsed: !collapsed })}
              >
                {collapsed ? TEXT.reportExpand : TEXT.reportCollapse}
                <span className="fold-mark" aria-hidden>
                  {collapsed ? '▸' : '▾'}
                </span>
              </button>
            </div>
            {!collapsed &&
              CATEGORIES.map((c) => (
                <div key={c} className={`report-row cat-${c}`}>
                  <span className="report-name">{CATEGORY_LABEL[c]}</span>
                  <span className="meter" aria-hidden>
                    <span
                      className="meter-fill"
                      style={{ width: longest > 0 ? `${(totals[c] / longest) * 100}%` : '0%' }}
                    />
                  </span>
                  <span className="report-time">{formatHMS(totals[c])}</span>
                </div>
              ))}
          </section>
        </>
      )}
    </main>
  )
}
