import { useState } from 'react'
import { CATEGORIES, formatHMS, totalsBetween, type TimerState } from '../../../shared/timer'
import {
  PERIODS,
  dailyTotals,
  percentages,
  periodRange,
  sumTotals,
  type Period,
  type Range
} from '../../../shared/stats'
import { CATEGORY_LABEL, PERIOD_LABEL, TEXT } from '../../../shared/labels'
import { DailyChart } from '../components/DailyChart'

const DAY = 86_400_000
/** 날마다 막대는 두 달까지만 그린다 (그 이상은 막대가 너무 가늘다) */
const MAX_CHART_DAYS = 62

const toInput = (t: number): string => {
  const d = new Date(t)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const fromInput = (v: string): number | null => {
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d).getTime() : null
}

export function StatsView({ state, now }: { state: TimerState; now: number }): React.JSX.Element {
  const [period, setPeriod] = useState<Period>('week')
  const [custom, setCustom] = useState<Range>(() => ({ from: now - 6 * DAY, to: now }))

  const range = periodRange(period, now, custom)
  const totals = totalsBetween(state, range.from, range.to, now)
  const sum = sumTotals(totals)
  const pct = percentages(totals)
  const days = period === 'today' ? [] : dailyTotals(state, range, now)

  return (
    <div className="stats">
      <div className="segmented" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            className={period === p ? 'is-on' : ''}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="custom-range">
          <input
            type="date"
            value={toInput(custom.from)}
            onChange={(e) => {
              const t = fromInput(e.target.value)
              if (t !== null) setCustom((c) => ({ ...c, from: t }))
            }}
          />
          <span>{TEXT.customFrom}</span>
          <input
            type="date"
            value={toInput(custom.to)}
            onChange={(e) => {
              const t = fromInput(e.target.value)
              if (t !== null) setCustom((c) => ({ ...c, to: t }))
            }}
          />
          <span>{TEXT.customTo}</span>
        </div>
      )}

      <section className="panel totals">
        {/* 분야 비율: 가로 누적 막대 하나 */}
        <div className="ratio" aria-hidden>
          {CATEGORIES.map((c) =>
            totals[c] > 0 ? (
              <span key={c} className={`ratio-seg cat-${c}`} style={{ flexGrow: totals[c] }} />
            ) : null
          )}
        </div>
        {/* 범례 겸 표: 분야 이름·시간·비율 */}
        <table className="totals-table">
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c} className={`cat-${c}`}>
                <th scope="row">
                  <i className="swatch" />
                  {CATEGORY_LABEL[c]}
                </th>
                <td>{formatHMS(totals[c])}</td>
                <td className="pct">{pct[c]}%</td>
              </tr>
            ))}
            <tr className="sum">
              <th scope="row">{TEXT.statsTotal}</th>
              <td>{formatHMS(sum)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      {period !== 'today' && (
        <section className="panel daily">
          <h2>{TEXT.statsDaily}</h2>
          {sum === 0 ? (
            <p className="empty">{TEXT.statsEmpty}</p>
          ) : days.length > MAX_CHART_DAYS ? (
            <p className="empty">{TEXT.statsTooLong}</p>
          ) : (
            <DailyChart days={days} now={now} weekly={period === 'week'} />
          )}
        </section>
      )}
      {period === 'today' && sum === 0 && <p className="empty">{TEXT.statsEmpty}</p>}
    </div>
  )
}
