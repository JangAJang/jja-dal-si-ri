import { afterAll, describe, expect, it } from 'vitest'
import { dailyTotals, nextDay, periodRange, startOfWeek } from './stats'
import { startOfDay, totalsBetween, type TimerState } from './timer'

// 저장은 epoch ms(UTC 기준 절대 시각), 날짜 나누기는 보는 기기의 현지 시간대.
// 날짜 계산이 윤년·월 길이·서머타임에서도 맞는지, 여러 시간대에서 같은 테스트를 돌린다.
// (Node 는 실행 중 process.env.TZ 를 바꾸면 Date 가 바로 그 시간대를 따른다.)
const ZONES = ['Asia/Seoul', 'America/New_York', 'Europe/London', 'Australia/Lord_Howe', 'UTC']
const originalTz = process.env.TZ
afterAll(() => {
  process.env.TZ = originalTz
})

const H = 3_600_000
const local = (y: number, m: number, d: number, h = 0): number => new Date(y, m - 1, d, h).getTime()

describe.each(ZONES)('%s', (zone) => {
  const useZone = (): void => {
    process.env.TZ = zone
  }

  it('시간대 전환이 실제로 적용된다 (테스트 전제)', () => {
    useZone()
    const offset = new Date(Date.UTC(2026, 0, 15)).getTimezoneOffset()
    const expected: Record<string, number> = {
      'Asia/Seoul': -540,
      'America/New_York': 300,
      'Europe/London': 0,
      'Australia/Lord_Howe': -660,
      UTC: 0
    }
    expect(offset).toBe(expected[zone])
  })

  it('윤년: 2028년 2월은 29일, 평년 2027년 2월은 28일', () => {
    useZone()
    const days = (y: number): number => {
      const r = periodRange('month', local(y, 2, 10, 12))
      return dailyTotals({ active: null, sessions: [] }, r, 0).length
    }
    expect(days(2028)).toBe(29)
    expect(days(2027)).toBe(28)
  })

  it('윤일(2/29)에 걸친 기록이 2/28·2/29·3/1 로 나뉜다', () => {
    useZone()
    const state: TimerState = {
      active: null,
      sessions: [
        {
          id: 'a',
          category: 'work',
          startedAt: local(2028, 2, 28, 23),
          endedAt: local(2028, 3, 1, 1)
        }
      ]
    }
    const r = { from: local(2028, 2, 28), to: local(2028, 3, 2) }
    const days = dailyTotals(state, r, 0)
    expect(days.map((d) => new Date(d.day).getDate())).toEqual([28, 29, 1])
    // 하루 길이는 시간대에 따라 23·24·25시간일 수 있으니 합계는 기록 길이와 같아야 한다
    const total = days.reduce((s, d) => s + d.totals.work, 0)
    expect(total).toBe(local(2028, 3, 1, 1) - local(2028, 2, 28, 23))
  })

  it('연말을 걸친 주: 2026-12-31(목)이 속한 주는 12/28(월)부터 1/4 까지', () => {
    useZone()
    expect(startOfWeek(local(2026, 12, 31, 12))).toBe(local(2026, 12, 28))
    expect(periodRange('week', local(2027, 1, 2, 12))).toEqual({
      from: local(2026, 12, 28),
      to: local(2027, 1, 4)
    })
  })

  it('서머타임이 바뀌는 날도 하루는 자정에서 자정까지다', () => {
    useZone()
    // 2026년 서머타임 전환이 있는 달들(미국 3·11월, 영국 3·10월, 로드하우 4·10월)을 하루씩 걸어 본다
    for (const [y, m] of [
      [2026, 3],
      [2026, 4],
      [2026, 10],
      [2026, 11]
    ]) {
      const r = periodRange('month', local(y, m, 15, 12))
      for (let day = r.from; day < r.to; day = nextDay(day)) {
        expect(new Date(day).getHours()).toBe(0)
        expect(new Date(day).getMinutes()).toBe(0)
        expect(startOfDay(day + 12 * H)).toBe(day)
      }
    }
  })

  it('하루 합계는 그날 실제 길이(23·24·25시간 등)를 넘지 않는다', () => {
    useZone()
    const r = periodRange('month', local(2026, 3, 15, 12))
    const allMonth: TimerState = {
      active: null,
      sessions: [{ id: 'x', category: 'study', startedAt: r.from, endedAt: r.to }]
    }
    for (const d of dailyTotals(allMonth, r, 0)) {
      expect(d.totals.study).toBe(nextDay(d.day) - d.day)
    }
    expect(totalsBetween(allMonth, r.from, r.to, 0).study).toBe(r.to - r.from)
  })
})
