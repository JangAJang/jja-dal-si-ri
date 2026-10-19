import { useEffect, useState } from 'react'
import {
  CATEGORIES,
  formatHMS,
  startOfDay,
  totalsBetween,
  type TimerState
} from '../../shared/timer'
import { CATEGORY_LABEL, TEXT } from '../../shared/labels'

const DAY_MS = 24 * 60 * 60 * 1000

/** 1초마다 갱신되는 현재 시각. 표시용 시간은 항상 (now - startedAt) 으로 계산한다. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function App(): React.JSX.Element {
  const [state, setState] = useState<TimerState | null>(null)
  const now = useNow()

  useEffect(() => {
    window.api.getState().then(setState)
    return window.api.onChanged(setState)
  }, [])

  if (!state) return <main className="app" />

  const active = state.active
  const today = startOfDay(now)
  const totals = totalsBetween(state, today, today + DAY_MS, now)

  return (
    <main className="app">
      <section className={`current ${active ? `cat-${active.category}` : 'idle'}`}>
        <div className="current-label">
          {active ? `● ${CATEGORY_LABEL[active.category]} 중` : TEXT.idle}
        </div>
        <div className="current-time">{formatHMS(active ? now - active.startedAt : 0)}</div>
      </section>

      <section className="controls">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`start cat-${c}`}
            disabled={active?.category === c}
            onClick={() => window.api.start(c)}
          >
            {CATEGORY_LABEL[c]} 시작
          </button>
        ))}
        <button className="stop" disabled={!active} onClick={() => window.api.stop()}>
          종료
        </button>
      </section>

      <section className="today">
        <h2>오늘</h2>
        {CATEGORIES.map((c) => (
          <div key={c} className="today-row">
            <span className={`dot cat-${c}`} />
            <span>{CATEGORY_LABEL[c]}</span>
            <span className="today-time">{formatHMS(totals[c])}</span>
          </div>
        ))}
      </section>
    </main>
  )
}

export default App
