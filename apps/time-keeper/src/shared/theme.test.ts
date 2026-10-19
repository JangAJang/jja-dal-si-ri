import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHELL,
  MIN_TEXT_CONTRAST,
  SHELL_PRESETS,
  contrast,
  hexToRgb,
  rgbToHex,
  shellTokens
} from './theme'

const rgb = (hex: string): { r: number; g: number; b: number } => hexToRgb(hex)!

describe('hex ↔ rgb', () => {
  it('왕복 변환', () => {
    expect(hexToRgb('#B9DEC9')).toEqual({ r: 185, g: 222, b: 201 })
    expect(rgbToHex({ r: 185, g: 222, b: 201 })).toBe('#B9DEC9')
  })

  it('범위 밖 값은 0~255 로 자른다', () => {
    expect(rgbToHex({ r: -5, g: 300, b: 12.6 })).toBe('#00FF0D')
  })

  it('잘못된 hex 는 null', () => {
    expect(hexToRgb('#12345')).toBeNull()
    expect(hexToRgb('zzzzzz')).toBeNull()
  })
})

describe('shellTokens', () => {
  it('기본 민트는 디자인에서 맞춘 값을 그대로 쓴다', () => {
    expect(shellTokens(DEFAULT_SHELL).shellEdge).toBe('#8FC4AB')
  })

  it('어두운 본체에는 밝은 글자', () => {
    expect(shellTokens('#3B4440').ink).toBe('#F6F4EE')
  })

  it('프리셋 전부: 글자 대비 4.5:1 이상', () => {
    for (const hex of SHELL_PRESETS) {
      const t = shellTokens(hex)
      expect(contrast(rgb(t.ink), rgb(t.shell))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it('어떤 색을 골라도(RGB 4096가지 표본) 글자 대비 4.5:1, 보조 글자 3:1 이상', () => {
    for (let r = 0; r < 256; r += 17)
      for (let g = 0; g < 256; g += 17)
        for (let b = 0; b < 256; b += 17) {
          const t = shellTokens(rgbToHex({ r, g, b }))
          expect(contrast(rgb(t.ink), rgb(t.shell))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
          expect(contrast(rgb(t.inkSoft), rgb(t.shell))).toBeGreaterThanOrEqual(3)
        }
  })
})
