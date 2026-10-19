import { describe, expect, it } from 'vitest'
import {
  canStart,
  formatHMS,
  heartbeat,
  minuteHandAngle,
  recover,
  select,
  start,
  stop,
  totalsBetween,
  type TimerState
} from './timer'

const empty: TimerState = { active: null, sessions: [] }
const H = 3_600_000

describe('start', () => {
  it('진행 중인 게 없으면 새 기록을 시작한다', () => {
    const s = start(empty, 'work', 1000, 'a')
    expect(s.active).toEqual({ id: 'a', category: 'work', startedAt: 1000, lastHeartbeatAt: 1000 })
    expect(s.sessions).toEqual([])
  })

  it('다른 분야를 시작하면 현재 기록을 그 시각으로 마감하고 전환한다', () => {
    const s = start(start(empty, 'work', 1000, 'a'), 'break', 5000, 'b')
    expect(s.sessions).toEqual([{ id: 'a', category: 'work', startedAt: 1000, endedAt: 5000 }])
    expect(s.active?.category).toBe('break')
    expect(s.active?.startedAt).toBe(5000)
  })

  it('같은 분야를 다시 누르면 아무것도 바꾸지 않는다', () => {
    const s1 = start(empty, 'study', 1000, 'a')
    expect(start(s1, 'study', 9000, 'b')).toBe(s1)
  })
})

describe('stop / recover', () => {
  it('stop 은 진행 중인 기록을 마감한다', () => {
    const s = stop(start(empty, 'study', 1000, 'a'), 4000)
    expect(s.active).toBeNull()
    expect(s.sessions[0].endedAt).toBe(4000)
  })

  it('recover 는 마지막 heartbeat 시각으로 마감한다', () => {
    const s = recover(heartbeat(start(empty, 'work', 1000, 'a'), 31_000))
    expect(s.active).toBeNull()
    expect(s.sessions[0].endedAt).toBe(31_000)
  })
})

describe('totalsBetween', () => {
  it('자정을 넘긴 기록은 구간별로 잘려 집계된다', () => {
    const midnight = new Date(2026, 9, 20).getTime()
    const s: TimerState = {
      active: null,
      sessions: [{ id: 'a', category: 'study', startedAt: midnight - H, endedAt: midnight + 2 * H }]
    }
    expect(totalsBetween(s, midnight - 24 * H, midnight, 0).study).toBe(H)
    expect(totalsBetween(s, midnight, midnight + 24 * H, 0).study).toBe(2 * H)
  })

  it('진행 중인 기록은 now 까지 포함한다', () => {
    const s = start(empty, 'work', 0, 'a')
    expect(totalsBetween(s, 0, 10 * H, 3 * H).work).toBe(3 * H)
  })
})

describe('select / canStart (준비 → 시작)', () => {
  const working = start(empty, 'work', 0, 'a').active

  it('대기 중에 분야를 누르면 준비 상태가 되고 시작할 수 있다', () => {
    expect(select(null, 'study', null)).toBe('study')
    expect(canStart('study', null)).toBe(true)
  })

  it('준비된 분야를 다시 누르면 선택이 풀린다', () => {
    expect(select('study', 'study', null)).toBeNull()
    expect(canStart(null, null)).toBe(false)
  })

  it('진행 중에 다른 분야를 누르면 준비만 바뀌고, 시작해야 전환된다', () => {
    expect(select(null, 'break', working)).toBe('break')
    expect(canStart('break', working)).toBe(true)
  })

  it('진행 중인 분야를 누르면 전환 예약이 취소된다', () => {
    expect(select('break', 'work', working)).toBeNull()
    expect(canStart('work', working)).toBe(false)
  })
})

describe('minuteHandAngle', () => {
  it('시작 시 12시, 15분에 3시, 60분에 다시 12시', () => {
    expect(minuteHandAngle(0)).toBe(0)
    expect(minuteHandAngle(15 * 60_000)).toBe(90)
    expect(minuteHandAngle(H)).toBe(0)
    expect(minuteHandAngle(H + 30 * 60_000)).toBe(180)
  })
})

describe('formatHMS', () => {
  it('시:분:초로 표시하고 ms 는 버린다', () => {
    expect(formatHMS(0)).toBe('00:00:00')
    expect(formatHMS(3_723_999)).toBe('01:02:03')
    expect(formatHMS(100 * H)).toBe('100:00:00')
  })
})
