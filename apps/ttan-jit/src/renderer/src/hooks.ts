import { useCallback, useEffect, useRef, useState } from 'react'
import type { DisplayInfo } from '../../shared/displays'
import type { SavedGames } from '../../shared/games'
import type { ResolvedSettings } from '../../shared/settings'

/** 패널이 보이는지. 게임은 false 일 때 시계를 멈춘다 (docs/design.md > 게임 공통). */
export function usePanelVisible(): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => window.api.onVisibility(setVisible), [])
  return visible
}

/** 설정. 처음 읽기 전에는 null, 이후 바뀔 때마다 다시 그린다. */
export function useSettings(): ResolvedSettings | null {
  const [settings, setSettings] = useState<ResolvedSettings | null>(null)
  useEffect(() => {
    window.api.getSettings().then(setSettings)
    return window.api.onSettings(setSettings)
  }, [])
  return settings
}

/** 모니터 목록. 꽂거나 뽑거나 배치가 바뀌면 다시 그린다. */
export function useDisplays(): DisplayInfo[] {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  useEffect(() => {
    window.api.getDisplays().then(setDisplays)
    return window.api.onDisplays(setDisplays)
  }, [])
  return displays
}

/** 저장된 게임을 읽고, 바뀔 때마다 main 에 저장을 맡긴다. 읽기 전에는 null. */
export function useGames(): [SavedGames | null, (fn: (g: SavedGames) => SavedGames) => void] {
  const [games, setGames] = useState<SavedGames | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    window.api.loadGames().then(setGames)
  }, [])

  useEffect(() => {
    if (!games) return
    // 막 읽어 온 값은 다시 저장하지 않는다.
    if (!loaded.current) {
      loaded.current = true
      return
    }
    window.api.saveGames(games)
  }, [games])

  const update = useCallback((fn: (g: SavedGames) => SavedGames) => {
    setGames((prev) => (prev ? fn(prev) : prev))
  }, [])

  return [games, update]
}
