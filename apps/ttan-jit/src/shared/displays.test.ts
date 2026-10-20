import { describe, expect, it } from 'vitest'
import { isCornerBlocked, pickDisplay, sortDisplays, type DisplayInfo } from './displays'

const d = (
  id: number,
  x: number,
  y: number,
  width: number,
  height: number,
  primary = false
): DisplayInfo => ({
  id,
  bounds: { x, y, width, height },
  primary,
  label: ''
})

// 실제 사용자 배치: 주 3440×1440 양옆에 1920×1080, 옆 모니터는 주 모니터보다 아래에서 시작.
const main = d(2, 0, 0, 3440, 1440, true)
const right = d(1, 3440, 368, 1920, 1080)
const left = d(3, -1920, 361, 1920, 1080)
const user = [main, right, left]

describe('isCornerBlocked', () => {
  it('모니터 하나면 네 모서리 모두 쓸 수 있다', () => {
    for (const c of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      expect(isCornerBlocked(main, c, [main])).toBe(false)
    }
  })

  it('사용자 배치: 주 모니터 위쪽은 벽, 아래쪽은 옆 모니터와 맞닿아 막힘', () => {
    expect(isCornerBlocked(main, 'top-left', user)).toBe(false)
    expect(isCornerBlocked(main, 'top-right', user)).toBe(false)
    expect(isCornerBlocked(main, 'bottom-left', user)).toBe(true)
    expect(isCornerBlocked(main, 'bottom-right', user)).toBe(true)
  })

  it('사용자 배치: 옆 모니터는 바깥쪽 모서리만 쓸 수 있다', () => {
    // 오른쪽 모니터의 왼쪽 위(3440, 368)는 왼쪽에 주 모니터가 있어 막힘
    expect(isCornerBlocked(right, 'top-left', user)).toBe(true)
    // 왼쪽 아래(3440, 1447): 왼쪽 (3439, 1447)은 주 모니터 밖(높이 1440) → 벽, 아래도 벽
    expect(isCornerBlocked(right, 'bottom-left', user)).toBe(false)
    expect(isCornerBlocked(right, 'top-right', user)).toBe(false)
    expect(isCornerBlocked(right, 'bottom-right', user)).toBe(false)
    expect(isCornerBlocked(left, 'top-right', user)).toBe(true)
    expect(isCornerBlocked(left, 'top-left', user)).toBe(false)
  })

  it('위아래로 쌓은 모니터는 맞닿은 쪽이 막힘', () => {
    const bottom = d(1, 0, 0, 1920, 1080, true)
    const top = d(2, 0, -1080, 1920, 1080)
    expect(isCornerBlocked(bottom, 'top-left', [bottom, top])).toBe(true)
    expect(isCornerBlocked(bottom, 'bottom-left', [bottom, top])).toBe(false)
    expect(isCornerBlocked(top, 'bottom-right', [bottom, top])).toBe(true)
  })

  it('높이가 딱 맞게 붙은 모니터는 위·아래 모서리 모두 막힘', () => {
    const a = d(1, 0, 0, 1920, 1080, true)
    const b = d(2, 1920, 0, 1920, 1080)
    expect(isCornerBlocked(a, 'top-right', [a, b])).toBe(true)
    expect(isCornerBlocked(a, 'bottom-right', [a, b])).toBe(true)
    expect(isCornerBlocked(a, 'top-left', [a, b])).toBe(false)
  })

  it('대각선으로만 닿으면 막히지 않음', () => {
    const a = d(1, 0, 0, 1920, 1080, true)
    const b = d(2, 1920, 1080, 1920, 1080)
    expect(isCornerBlocked(a, 'bottom-right', [a, b])).toBe(false)
  })
})

describe('pickDisplay', () => {
  it('고른 모니터 → 없으면 주 모니터 → 그것도 없으면 첫 모니터', () => {
    expect(pickDisplay(user, 1)).toBe(right)
    expect(pickDisplay(user, 99)).toBe(main)
    expect(pickDisplay(user, null)).toBe(main)
    expect(pickDisplay([right, left], null)).toBe(right)
    expect(pickDisplay([], null)).toBeUndefined()
  })
})

describe('sortDisplays', () => {
  it('왼쪽부터', () => {
    expect(sortDisplays(user).map((x) => x.id)).toEqual([3, 2, 1])
  })
})
