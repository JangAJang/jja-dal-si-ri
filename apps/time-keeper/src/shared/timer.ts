// 타이머 도메인 로직. main/renderer 양쪽에서 쓰는 순수 함수만 둔다 (Electron·Node API 금지).

export const CATEGORIES = ['work', 'break', 'study'] as const
export type Category = (typeof CATEGORIES)[number]

/** 끝난 기록 하나. 시각은 epoch ms. */
export interface Session {
  id: string
  category: Category
  startedAt: number
  endedAt: number
}

/** 진행 중인 기록. lastHeartbeatAt 은 비정상 종료 시 마감 시각으로 쓴다. */
export interface ActiveSession {
  id: string
  category: Category
  startedAt: number
  lastHeartbeatAt: number
}

export interface TimerState {
  active: ActiveSession | null
  sessions: Session[]
}

export type Totals = Record<Category, number>

export function emptyTotals(): Totals {
  return { work: 0, break: 0, study: 0 }
}

function close(active: ActiveSession, endedAt: number): Session {
  return {
    id: active.id,
    category: active.category,
    startedAt: active.startedAt,
    endedAt: Math.max(endedAt, active.startedAt)
  }
}

/**
 * 분야 시작. 다른 분야가 진행 중이면 now 로 마감하고 전환한다.
 * 같은 분야가 이미 진행 중이면 상태를 바꾸지 않는다.
 */
export function start(
  state: TimerState,
  category: Category,
  now: number,
  newId: string
): TimerState {
  if (state.active?.category === category) return state
  const sessions = state.active ? [...state.sessions, close(state.active, now)] : state.sessions
  return {
    sessions,
    active: { id: newId, category, startedAt: now, lastHeartbeatAt: now }
  }
}

/** 진행 중인 기록을 endedAt 으로 마감한다. 진행 중인 게 없으면 그대로. */
export function stop(state: TimerState, endedAt: number): TimerState {
  if (!state.active) return state
  return { sessions: [...state.sessions, close(state.active, endedAt)], active: null }
}

export function heartbeat(state: TimerState, now: number): TimerState {
  if (!state.active) return state
  return { ...state, active: { ...state.active, lastHeartbeatAt: now } }
}

/** 앱 시작 시: 남아 있는 active 는 비정상 종료의 흔적이므로 마지막 heartbeat 시각으로 마감한다. */
export function recover(state: TimerState): TimerState {
  if (!state.active) return state
  return stop(state, state.active.lastHeartbeatAt)
}

/**
 * [from, to) 구간에 걸친 분야별 합계(ms). 구간 밖으로 삐져나간 부분은 잘라낸다 —
 * 자정을 넘긴 기록이 날짜별로 나뉘어 집계되는 이유가 이것이다.
 */
export function totalsBetween(state: TimerState, from: number, to: number, now: number): Totals {
  const totals = emptyTotals()
  const all: Array<Pick<Session, 'category' | 'startedAt' | 'endedAt'>> = [...state.sessions]
  if (state.active) all.push({ ...state.active, endedAt: now })
  for (const s of all) {
    const overlap = Math.min(s.endedAt, to) - Math.max(s.startedAt, from)
    if (overlap > 0) totals[s.category] += overlap
  }
  return totals
}

/** 로컬 시간 기준 그날 자정. */
export function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** ms → "HH:MM:SS". 100시간 이상이면 시 자리가 늘어난다. */
export function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
