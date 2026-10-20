import { describe, expect, it } from 'vitest'
import {
  HIDDEN,
  contains,
  hotzoneRect,
  nextPanelState,
  panelRect,
  type PanelState,
  type Rect
} from './hotzone'

const display: Rect = { x: 0, y: 0, width: 1920, height: 1080 }
// 주 모니터가 아닌 위치에 있는 화면처럼 원점이 0이 아닌 경우도 본다.
const offset: Rect = { x: -1280, y: 200, width: 1280, height: 720 }

describe('contains', () => {
  it('왼쪽·위 경계는 포함, 오른쪽·아래 경계는 제외', () => {
    const r = { x: 10, y: 10, width: 5, height: 5 }
    expect(contains(r, { x: 10, y: 10 })).toBe(true)
    expect(contains(r, { x: 14, y: 14 })).toBe(true)
    expect(contains(r, { x: 15, y: 14 })).toBe(false)
    expect(contains(r, { x: 14, y: 15 })).toBe(false)
  })
})

describe('hotzoneRect', () => {
  it('네 모서리의 8×8 사각형', () => {
    expect(hotzoneRect(display, 'top-left')).toEqual({ x: 0, y: 0, width: 8, height: 8 })
    expect(hotzoneRect(display, 'top-right')).toEqual({ x: 1912, y: 0, width: 8, height: 8 })
    expect(hotzoneRect(display, 'bottom-left')).toEqual({ x: 0, y: 1072, width: 8, height: 8 })
    expect(hotzoneRect(display, 'bottom-right')).toEqual({ x: 1912, y: 1072, width: 8, height: 8 })
  })

  it('커서가 멈추는 마지막 픽셀이 핫존 안에 있다', () => {
    expect(contains(hotzoneRect(display, 'top-right'), { x: 1919, y: 0 })).toBe(true)
    expect(contains(hotzoneRect(display, 'bottom-right'), { x: 1919, y: 1079 })).toBe(true)
    expect(contains(hotzoneRect(offset, 'bottom-left'), { x: -1280, y: 919 })).toBe(true)
  })
})

describe('panelRect', () => {
  it('핫존과 같은 모서리에 붙고 핫존을 품는다', () => {
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      const panel = panelRect(display, corner)
      const hot = hotzoneRect(display, corner)
      expect(contains(panel, { x: hot.x, y: hot.y })).toBe(true)
      expect(contains(panel, { x: hot.x + hot.width - 1, y: hot.y + hot.height - 1 })).toBe(true)
    }
  })

  it('오른쪽 위 패널 위치', () => {
    expect(panelRect(display, 'top-right')).toEqual({ x: 1560, y: 0, width: 360, height: 400 })
  })

  it('화면보다 크면 화면 크기로 줄인다', () => {
    const tiny = { x: 0, y: 0, width: 300, height: 200 }
    expect(panelRect(tiny, 'bottom-right')).toEqual({ x: 0, y: 0, width: 300, height: 200 })
  })
})

describe('nextPanelState', () => {
  const tick = (
    now: number,
    inHotzone: boolean,
    inPanel = inHotzone
  ): Parameters<typeof nextPanelState>[1] => ({
    now,
    inHotzone,
    inPanel,
    dwellMs: 500
  })

  const run = (ticks: Parameters<typeof nextPanelState>[1][]): PanelState =>
    ticks.reduce(nextPanelState, HIDDEN)

  it('핫존에 dwellMs 머물면 나타난다', () => {
    expect(run([tick(0, true), tick(450, true)]).visible).toBe(false)
    expect(run([tick(0, true), tick(500, true)]).visible).toBe(true)
  })

  it('머무는 도중 벗어나면 처음부터 다시 잰다', () => {
    const s = run([tick(0, true), tick(400, false), tick(450, true), tick(900, true)])
    expect(s.visible).toBe(false)
    expect(nextPanelState(s, tick(950, true)).visible).toBe(true)
  })

  it('나타난 뒤 패널 안에 있으면 유지, 밖으로 나가면 즉시 숨김', () => {
    const shown = run([tick(0, true), tick(500, true)])
    expect(nextPanelState(shown, tick(600, false, true))).toBe(shown)
    expect(nextPanelState(shown, tick(650, false, false))).toEqual(HIDDEN)
  })

  it('숨긴 뒤 다시 모서리로 가면 다시 dwellMs 기다린다', () => {
    const hidden = run([tick(0, true), tick(500, true), tick(600, false, false)])
    expect(nextPanelState(hidden, tick(650, true)).visible).toBe(false)
    expect(
      run([
        tick(0, true),
        tick(500, true),
        tick(600, false, false),
        tick(650, true),
        tick(1150, true)
      ]).visible
    ).toBe(true)
  })
})
