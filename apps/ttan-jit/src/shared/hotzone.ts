// 핫존(화면 모서리)과 패널 위치, 나타나기·사라지기 판정 (docs/design.md > 핫존, 나타나기·사라지기).
// 좌표는 모두 Electron 화면 좌표(DIP). main 이 숨김 중 50ms, 표시 중 약 16ms 마다 커서 위치를 넣어 부른다.

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export const DEFAULT_CORNER: Corner = 'top-right'
export const HOTZONE_SIZE = 8
export const DEFAULT_DWELL_MS = 500
export const POLL_MS = 50
/** 패널이 보이는 동안의 폴링 간격. Windows 타이머 해상도(15.6ms) 탓에 16 을 주면 31ms 가 되므로 8 을 줘서 한 틱마다 돈다. */
export const VISIBLE_POLL_MS = 8
export const PANEL_SIZE: Size = { width: 360, height: 400 }

export function contains(rect: Rect, p: Point): boolean {
  return p.x >= rect.x && p.x < rect.x + rect.width && p.y >= rect.y && p.y < rect.y + rect.height
}

/** 화면(display.bounds) 모서리에 붙은 size 크기의 사각형. 화면보다 크면 화면 크기로 줄인다. */
export function cornerRect(display: Rect, corner: Corner, size: Size): Rect {
  const width = Math.min(size.width, display.width)
  const height = Math.min(size.height, display.height)
  const right = corner === 'top-right' || corner === 'bottom-right'
  const bottom = corner === 'bottom-left' || corner === 'bottom-right'
  return {
    x: right ? display.x + display.width - width : display.x,
    y: bottom ? display.y + display.height - height : display.y,
    width,
    height
  }
}

/**
 * 핫존. 작업 영역(workArea)이 아니라 화면 전체(bounds)의 모서리다 —
 * 커서는 작업표시줄 위의 진짜 모서리에서 멈추기 때문.
 */
export function hotzoneRect(display: Rect, corner: Corner): Rect {
  return cornerRect(display, corner, { width: HOTZONE_SIZE, height: HOTZONE_SIZE })
}

/** 패널도 같은 모서리에 붙인다. 그래서 나타난 순간 커서는 이미 패널 안에 있다. */
export function panelRect(display: Rect, corner: Corner, size: Size = PANEL_SIZE): Rect {
  return cornerRect(display, corner, size)
}

export type PanelState = { visible: false; dwellSince: number | null } | { visible: true }

export const HIDDEN: PanelState = { visible: false, dwellSince: null }

export interface Tick {
  now: number
  inHotzone: boolean
  inPanel: boolean
  dwellMs: number
}

/** 한 번의 폴링 결과로 다음 상태를 정한다. 나타나기는 dwellMs 머문 뒤, 사라지기는 즉시. */
export function nextPanelState(state: PanelState, t: Tick): PanelState {
  if (state.visible) return t.inPanel ? state : HIDDEN
  if (!t.inHotzone) return state.dwellSince === null ? state : HIDDEN
  const since = state.dwellSince ?? t.now
  return t.now - since >= t.dwellMs ? { visible: true } : { visible: false, dwellSince: since }
}
