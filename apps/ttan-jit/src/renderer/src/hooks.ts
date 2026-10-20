import { useEffect, useState } from 'react'

/** 패널이 보이는지. 게임은 false 일 때 시계를 멈춘다 (docs/design.md > 게임 공통). */
export function usePanelVisible(): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => window.api.onVisibility(setVisible), [])
  return visible
}
