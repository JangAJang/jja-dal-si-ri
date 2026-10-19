import { useState } from 'react'
import { CATEGORIES, formatHMS, startOfDay } from '../../../shared/timer'
import { sumTotals, type DayTotals } from '../../../shared/stats'
import { useT } from '../i18n'

const HOUR = 3_600_000

interface Props {
  days: DayTotals[]
  now: number
  /** 주 단위면 요일, 아니면 날짜 숫자로 아래 눈금을 단다 */
  weekly: boolean
}

/**
 * 날마다 분야별 누적 막대. 아래→위 순서는 일·쉼·공부로 고정(색은 분야를 따라간다).
 * 세로축 최댓값은 가장 긴 날을 시간 단위로 올림. 막대에 마우스를 올리면 그날 값이 뜬다.
 */
export function DailyChart({ days, now, weekly }: Props): React.JSX.Element {
  const t = useT()
  const [hovered, setHovered] = useState<number | null>(null)
  const today = startOfDay(now)
  const longest = Math.max(0, ...days.map((d) => sumTotals(d.totals)))
  const maxHours = Math.max(1, Math.ceil(longest / HOUR))
  const scale = maxHours * HOUR
  const tip = hovered !== null ? days[hovered] : null

  const tickLabel = (day: number, i: number): string => {
    const d = new Date(day)
    if (weekly) return t.weekday[d.getDay()]
    const n = d.getDate()
    // 2주 이하면 날마다, 그보다 길면 1일·5의 배수만
    if (days.length <= 14) return String(n)
    return i === 0 || n === 1 || n % 5 === 0 ? String(n) : ''
  }

  return (
    <figure className="chart" onMouseLeave={() => setHovered(null)}>
      <div className="chart-plot">
        <span className="chart-max">{t.hours(maxHours)}</span>
        <div className="chart-cols" style={{ gap: days.length > 14 ? 2 : 6 }}>
          {days.map((d, i) => {
            const total = sumTotals(d.totals)
            return (
              <div
                key={d.day}
                className={`chart-col ${hovered === i ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHovered(i)}
              >
                <div className="chart-stack" style={{ height: `${(total / scale) * 100}%` }}>
                  {CATEGORIES.map((c) =>
                    d.totals[c] > 0 ? (
                      <span
                        key={c}
                        className={`chart-seg cat-${c}`}
                        style={{ flexGrow: d.totals[c] }}
                      />
                    ) : null
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="chart-ticks" style={{ gap: days.length > 14 ? 2 : 6 }}>
        {days.map((d, i) => (
          <span key={d.day} className={d.day === today ? 'is-today' : ''}>
            {tickLabel(d.day, i)}
          </span>
        ))}
      </div>

      {tip && hovered !== null && (
        <div
          className="chart-tip"
          // 양 끝 막대에서도 툴팁이 패널 밖으로 잘리지 않게 가운데 쪽으로 붙잡는다
          style={{
            left: `clamp(68px, ${((hovered + 0.5) / days.length) * 100}%, calc(100% - 68px))`
          }}
          role="status"
        >
          <strong>{t.dayTitle(tip.day)}</strong>
          {CATEGORIES.map((c) => (
            <span key={c} className={`tip-row cat-${c}`}>
              <i className="swatch" />
              {t.category[c]}
              <em>{formatHMS(tip.totals[c])}</em>
            </span>
          ))}
        </div>
      )}
    </figure>
  )
}
