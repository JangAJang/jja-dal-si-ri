// 여러 모니터에서 핫존을 둘 모니터 고르기·막힌 모서리 판정 (docs/design.md > 핫존, #45).
// 좌표는 Electron 화면 좌표(DIP). main 이 screen.getAllDisplays() 를 이 형식으로 바꿔 넘긴다.
import type { Corner, Point, Rect } from './hotzone'

export interface DisplayInfo {
  id: number
  bounds: Rect
  primary: boolean
  /** OS 가 주는 모니터 이름 (없으면 빈 문자열). */
  label: string
}

const inside = (r: Rect, p: Point): boolean =>
  p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height

/** 모서리 꼭짓점 픽셀과, 그 바깥쪽으로 한 칸 나간 방향. */
function cornerPixel(b: Rect, corner: Corner): { p: Point; dx: number; dy: number } {
  const right = corner === 'top-right' || corner === 'bottom-right'
  const bottom = corner === 'bottom-left' || corner === 'bottom-right'
  return {
    p: { x: right ? b.x + b.width - 1 : b.x, y: bottom ? b.y + b.height - 1 : b.y },
    dx: right ? 1 : -1,
    dy: bottom ? 1 : -1
  }
}

/**
 * 모서리가 막혔는지 — 꼭짓점에서 가로나 세로로 한 칸 나간 자리에 다른 모니터가 있으면,
 * 커서를 모서리로 밀어도 멈추지 않고 넘어가 버려서 핫존으로 쓸 수 없다.
 * (대각선으로만 닿은 모니터는 커서가 넘어가지 못하니 막힌 것으로 보지 않는다.)
 */
export function isCornerBlocked(display: DisplayInfo, corner: Corner, all: DisplayInfo[]): boolean {
  const { p, dx, dy } = cornerPixel(display.bounds, corner)
  const others = all.filter((d) => d.id !== display.id)
  return others.some(
    (d) => inside(d.bounds, { x: p.x + dx, y: p.y }) || inside(d.bounds, { x: p.x, y: p.y + dy })
  )
}

/** 고른 모니터. 없으면(뽑혔거나 처음) 주 모니터, 그것도 없으면 첫 모니터. */
export function pickDisplay(all: DisplayInfo[], id: number | null): DisplayInfo | undefined {
  return all.find((d) => d.id === id) ?? all.find((d) => d.primary) ?? all[0]
}

/** 설정 창 그림 순서: 왼쪽부터, 같으면 위부터. 번호(1, 2, 3…)도 이 순서로 붙인다. */
export function sortDisplays(all: DisplayInfo[]): DisplayInfo[] {
  return [...all].sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y)
}
