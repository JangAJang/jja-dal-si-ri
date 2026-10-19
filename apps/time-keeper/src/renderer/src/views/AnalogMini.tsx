import { minuteHandAngle, type TimerState } from '../../../shared/timer'
import { TEXT } from '../../../shared/labels'
import { TimerControls } from '../components/TimerControls'
import { useMiniWindow, useSelection } from '../hooks'

const MINUTE_TICKS = Array.from({ length: 60 }, (_, i) => i)
// 12시(0분)는 바늘 출발점이라 숫자 대신 삼각 표식을 둔다
const NUMBERS = [15, 30, 45]

/**
 * 아날로그 미니: 주방 다이얼 타이머. 분침(빨간 바늘) 하나만, 기록 시작 시 0 에서 출발해
 * 60분에 한 바퀴. 숫자 시간은 없고 분야는 다이얼 테두리 색. 마우스를 올리면 키가 나타난다.
 */
export function AnalogMini({ state, now }: { state: TimerState; now: number }): React.JSX.Element {
  const selection = useSelection(state)
  const mini = useMiniWindow()
  const active = state.active
  const angle = active ? minuteHandAngle(now - active.startedAt) : 0
  const cat = active?.category ?? selection.selected

  return (
    <main className={`mini analog ${cat ? `cat-${cat}` : 'idle'}`} title={TEXT.miniHint} {...mini}>
      <svg className="dial" viewBox="0 0 100 100" aria-hidden>
        <circle className="dial-body" cx="50" cy="50" r="49" />
        <circle className="dial-ring" cx="50" cy="50" r="44" />
        <circle className="dial-face" cx="50" cy="50" r="40" />
        {MINUTE_TICKS.map((m) => (
          <line
            key={m}
            className={m % 5 === 0 ? 'tick major' : 'tick'}
            x1="50"
            y1="12"
            x2="50"
            y2={m % 5 === 0 ? 17 : 14.5}
            transform={`rotate(${m * 6} 50 50)`}
          />
        ))}
        {NUMBERS.map((n) => {
          const rad = ((n * 6 - 90) * Math.PI) / 180
          return (
            <text
              key={n}
              className="dial-num"
              x={50 + 25 * Math.cos(rad)}
              y={50 + 25 * Math.sin(rad)}
            >
              {n}
            </text>
          )
        })}
        <polygon className="zero-mark" points="50,4.5 53,9.5 47,9.5" />
        <g className={`hand ${active ? '' : 'is-idle'}`} transform={`rotate(${angle} 50 50)`}>
          <polygon points="50,15 52.2,52 47.8,52" />
        </g>
        <circle className="hub" cx="50" cy="50" r="4.5" />
      </svg>
      <div className="hover-keys">
        <TimerControls active={active} selection={selection} compact />
      </div>
    </main>
  )
}
