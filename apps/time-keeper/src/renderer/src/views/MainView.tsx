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

export function MainView({ state, now }: { state: TimerState; now: number }): React.JSX.Element {
  const [tab, setTab] = useState<'timer' | 'stats'>('timer')
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
          <button
            role="tab"
            aria-selected={tab === 'timer'}
            className={tab === 'timer' ? 'is-on' : ''}
            onClick={() => setTab('timer')}
          >
            {TEXT.tabTimer}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'stats'}
            className={tab === 'stats' ? 'is-on' : ''}
            onClick={() => setTab('stats')}
          >
            {TEXT.tabStats}
          </button>
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
      ) : (
        <>
          <Lcd
            label={headline(active, selected)}
            time={formatHMS(active ? now - active.startedAt : 0)}
            note={active && selected ? TEXT.nextUp(CATEGORY_READY[selected]) : undefined}
          />

          <TimerControls active={active} selection={selection} />

          <section className="report">
            <h2>{TEXT.today}</h2>
            {CATEGORIES.map((c) => (
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
