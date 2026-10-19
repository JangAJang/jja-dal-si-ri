import { useEffect, useState } from 'react'
import {
  CATEGORIES,
  canStart,
  formatHMS,
  select,
  startOfDay,
  totalsBetween,
  type Category,
  type TimerState
} from '../../shared/timer'
import { CATEGORY_LABEL, CATEGORY_RUNNING, TEXT } from '../../shared/labels'

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
  // "준비" 상태: 화면에서만 쓰는 선택값. 저장하지 않고 [시작]을 눌러야 기록이 바뀐다.
  const [selected, setSelected] = useState<Category | null>(null)
  const now = useNow()

  useEffect(() => {
    window.api.getState().then(setState)
    return window.api.onChanged(setState)
  }, [])

  if (!state) return <main className="app" />

  const active = state.active
  const today = startOfDay(now)
  const totals = totalsBetween(state, today, today + DAY_MS, now)
  const headerCategory = active?.category ?? selected

  const handleStart = (): void => {
    if (!selected || !canStart(selected, active)) return
    window.api.start(selected)
    setSelected(null)
  }

  const handleStop = (): void => {
    window.api.stop()
    setSelected(null)
  }

  return (
    <main className="app">
      <section className={`current ${headerCategory ? `cat-${headerCategory}` : 'idle'}`}>
        <div className="current-label">
          {active
            ? `● ${CATEGORY_RUNNING[active.category]}`
            : selected
              ? TEXT.ready(selected)
              : TEXT.idle}
        </div>
        <div className="current-time">{formatHMS(active ? now - active.startedAt : 0)}</div>
        {/* 진행 중에 다른 분야를 고르면, 지금 기록은 계속 세면서 다음 분야를 예고한다 */}
        <div className={`current-next ${selected ? `cat-${selected}` : ''}`}>
          {active && selected ? `→ ${TEXT.ready(selected)}` : ' '}
        </div>
      </section>

      <section className="controls">
        <div className="categories">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={[
                'category',
                `cat-${c}`,
                active?.category === c ? 'is-running' : '',
                selected === c ? 'is-selected' : ''
              ].join(' ')}
              onClick={() => setSelected(select(selected, c, active))}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="actions">
          <button
            className={`go ${selected ? `cat-${selected}` : ''}`}
            disabled={!canStart(selected, active)}
            onClick={handleStart}
          >
            {TEXT.start}
          </button>
          <button className="stop" disabled={!active} onClick={handleStop}>
            {TEXT.stop}
          </button>
        </div>
      </section>

      <section className="today">
        <h2>{TEXT.today}</h2>
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
