import { describe, expect, it } from 'vitest'
import { dailyTotals, percentages, periodRange, startOfWeek } from './stats'
import type { TimerState } from './timer'

const H = 3_600_000
// 2026-10-21 은 수요일
const wed = new Date(2026, 9, 21, 15, 30).getTime()
const day = (d: number, h = 0): number => new Date(2026, 9, d, h).getTime()

describe('periodRange', () => {
  it('오늘: 오늘 자정부터 내일 자정까지', () => {
    expect(periodRange('today', wed)).toEqual({ from: day(21), to: day(22) })
  })

  it('이번 주: 월요일 자정부터 7일', () => {
    expect(periodRange('week', wed)).toEqual({ from: day(19), to: day(26) })
  })

  it('일요일은 그 주의 마지막 날 (월요일 시작)', () => {
    expect(startOfWeek(day(25, 10))).toBe(day(19))
  })

  it('이번 달: 1일부터 다음 달 1일까지', () => {
    expect(periodRange('month', wed)).toEqual({
      from: day(1),
      to: new Date(2026, 10, 1).getTime()
    })
  })

  it('직접 지정: 시작·종료일을 모두 포함하고, 뒤바뀌면 바로잡는다', () => {
    const r = periodRange('custom', wed, { from: day(20, 9), to: day(18, 23) })
    expect(r).toEqual({ from: day(18), to: day(21) })
  })
})

describe('dailyTotals', () => {
  it('자정을 넘긴 기록을 날짜별로 나눈다', () => {
    const state: TimerState = {
      active: null,
      sessions: [{ id: 'a', category: 'study', startedAt: day(20, 23), endedAt: day(21, 2) }]
    }
    const days = dailyTotals(state, { from: day(20), to: day(22) }, wed)
    expect(days.map((d) => d.totals.study)).toEqual([H, 2 * H])
  })
})

describe('percentages', () => {
  it('합계가 100 이 되도록 맞춘다', () => {
    const p = percentages({ work: 1, break: 1, study: 1 })
    expect(p.work + p.break + p.study).toBe(100)
  })

  it('기록이 없으면 모두 0', () => {
    expect(percentages({ work: 0, break: 0, study: 0 })).toEqual({ work: 0, break: 0, study: 0 })
  })
})
