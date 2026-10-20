import { useCallback, useEffect, useRef, useState } from 'react'
import type { SavedGames } from '../../shared/games'

/** 패널이 보이는지. 게임은 false 일 때 시계를 멈춘다 (docs/design.md > 게임 공통). */
export function usePanelVisible(): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => window.api.onVisibility(setVisible), [])
  return visible
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
