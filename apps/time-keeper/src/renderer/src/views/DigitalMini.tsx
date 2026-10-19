import { formatHMS, type TimerState } from '../../../shared/timer'
import { headline } from '../../../shared/labels'
import { ExpandButton } from '../components/ExpandButton'
import { Lcd } from '../components/Lcd'
import { TimerControls } from '../components/TimerControls'
import { useMiniWindow, useSelection } from '../hooks'
import { useT } from '../i18n'

/** 디지털 미니: 작은 LCD 리모컨. 드래그로 이동, "다시 크게" 버튼이나 더블클릭으로 기본 모드. */
export function DigitalMini({ state, now }: { state: TimerState; now: number }): React.JSX.Element {
  const t = useT()
  const selection = useSelection(state)
  const mini = useMiniWindow()
  const active = state.active

  return (
    <main className="device mini digital" title={t.miniHint} {...mini}>
      <div className="mini-head">
        <Lcd
          size="small"
          label={headline(t, active, selection.selected)}
          time={formatHMS(active ? now - active.startedAt : 0)}
        />
        <ExpandButton />
      </div>
      <TimerControls active={active} selection={selection} compact />
    </main>
  )
}
