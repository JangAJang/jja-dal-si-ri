import { useCallback, useEffect, useState } from 'react'
import { canStart, select, type Category, type TimerState } from '../../shared/timer'
import type { SettingsSnapshot } from '../../shared/settings'

/** 1초마다 갱신되는 현재 시각. 표시용 시간은 항상 (now - startedAt) 으로 계산한다. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** main 의 TimerService 상태 구독. 첫 응답 전에는 null. */
export function useTimerState(): TimerState | null {
  const [state, setState] = useState<TimerState | null>(null)
  useEffect(() => {
    window.api.getState().then(setState)
    return window.api.onChanged(setState)
  }, [])
  return state
}

export interface Selection {
  selected: Category | null
  pick: (category: Category) => void
  canStart: boolean
  start: () => void
  stop: () => void
}

/**
 * 고르고 → 시작 2단계 흐름(#12). "준비" 선택값은 창마다의 화면 상태라 저장하지 않는다.
 * 선택은 고를 당시의 진행 기록에 묶인다 — 다른 창(미니 등)에서 시작·종료해 진행 기록이 바뀌면
 * 이 창의 준비 선택은 저절로 풀린다.
 */
export function useSelection(state: TimerState | null): Selection {
  const [pending, setPending] = useState<{ category: Category; activeId: string | null } | null>(
    null
  )
  const active = state?.active ?? null
  const selected = pending && pending.activeId === (active?.id ?? null) ? pending.category : null
  const startable = canStart(selected, active)

  const start = useCallback(() => {
    if (!selected || !startable) return
    window.api.start(selected)
    setPending(null)
  }, [selected, startable])

  const stop = useCallback(() => {
    window.api.stop()
    setPending(null)
  }, [])

  return {
    selected,
    pick: (c) => {
      const next = select(selected, c, active)
      setPending(next ? { category: next, activeId: active?.id ?? null } : null)
    },
    canStart: startable,
    start,
    stop
  }
}

/**
 * 미니 창 드래그 + 더블클릭으로 기본 모드.
 * 버튼 위에서 누른 경우는 드래그하지 않는다.
 */
export function useMiniWindow(): {
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
} {
  useEffect(() => {
    const end = (): void => window.api.dragEnd()
    window.addEventListener('mouseup', end)
    window.addEventListener('blur', end)
    return () => {
      window.removeEventListener('mouseup', end)
      window.removeEventListener('blur', end)
    }
  }, [])

  const onButton = (e: React.MouseEvent): boolean =>
    (e.target as HTMLElement).closest('button') !== null

  return {
    onMouseDown: (e) => {
      if (e.button === 0 && !onButton(e)) window.api.dragStart()
    },
    onDoubleClick: (e) => {
      if (onButton(e)) return
      window.api.dragEnd()
      window.api.openView('main')
    }
  }
}

/** main 의 SettingsService 설정 구독. 첫 응답 전에는 null. */
export function useSettings(): SettingsSnapshot | null {
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null)
  useEffect(() => {
    window.api.getSettings().then(setSettings)
    return window.api.onSettingsChanged(setSettings)
  }, [])
  return settings
}
