// 통계 화면(#6)용 기간·집계 계산. 순수 함수만 (Electron·Node API 금지).
import { CATEGORIES, startOfDay, totalsBetween, type TimerState, type Totals } from './timer'

export const PERIODS = ['today', 'week', 'month', 'custom'] as const
export type Period = (typeof PERIODS)[number]

/** [from, to) — to 는 포함하지 않는다. 모두 로컬 시간 자정 기준 epoch ms. */
export interface Range {
  from: number
  to: number
}

/** 하루 뒤 자정. 서머타임이 있어도 맞도록 24시간을 더하지 않고 날짜를 하나 올린다. */
export function nextDay(dayStart: number): number {
  const d = new Date(dayStart)
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

/** 그 주 월요일 자정 (한 주는 월요일에 시작). */
export function startOfWeek(t: number): number {
  const d = new Date(startOfDay(t))
  const sinceMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - sinceMonday)
  return d.getTime()
}

export function startOfMonth(t: number): number {
  const d = new Date(startOfDay(t))
  d.setDate(1)
  return d.getTime()
}

/**
 * 기간 → 날짜 구간. 오늘/이번 주/이번 달은 기간 전체(끝나지 않은 날 포함)를 돌려준다.
 * custom 은 시작일·종료일(둘 다 포함)을 받고, 순서가 뒤바뀌어 있으면 바로잡는다.
 */
export function periodRange(period: Period, now: number, custom?: Range): Range {
  switch (period) {
    case 'today': {
      const from = startOfDay(now)
      return { from, to: nextDay(from) }
    }
    case 'week': {
      const from = startOfWeek(now)
      let to = from
      for (let i = 0; i < 7; i++) to = nextDay(to)
      return { from, to }
    }
    case 'month': {
      const from = startOfMonth(now)
      const d = new Date(from)
      d.setMonth(d.getMonth() + 1)
      return { from, to: d.getTime() }
    }
    case 'custom': {
      const a = startOfDay(custom?.from ?? now)
      const b = startOfDay(custom?.to ?? now)
      return { from: Math.min(a, b), to: nextDay(Math.max(a, b)) }
    }
  }
}

export interface DayTotals {
  /** 그날 자정 */
  day: number
  totals: Totals
}

/** 구간을 하루씩 잘라 날마다 분야별 합계. 자정을 넘긴 기록은 날짜별로 나뉜다. */
export function dailyTotals(state: TimerState, range: Range, now: number): DayTotals[] {
  const days: DayTotals[] = []
  for (let day = range.from; day < range.to; day = nextDay(day)) {
    days.push({ day, totals: totalsBetween(state, day, nextDay(day), now) })
  }
  return days
}

export function sumTotals(totals: Totals): number {
  return CATEGORIES.reduce((sum, c) => sum + totals[c], 0)
}

/** 분야별 비율(0~100, 정수). 반올림 오차는 가장 큰 분야에 몰아 합계를 100 으로 맞춘다. */
export function percentages(totals: Totals): Totals {
  const sum = sumTotals(totals)
  const result = { work: 0, break: 0, study: 0 }
  if (sum === 0) return result
  for (const c of CATEGORIES) result[c] = Math.round((totals[c] / sum) * 100)
  const drift = 100 - sumTotals(result)
  const largest = CATEGORIES.reduce((a, b) => (totals[b] > totals[a] ? b : a))
  result[largest] += drift
  return result
}
