// 본체 색(배경 톤) 계산 (#21). 순수 함수만.
// 사용자가 고른 색 하나에서 테두리·그림자·글자 색을 만들고, 어떤 색이든 글자가 읽히게 한다.

export interface Rgb {
  r: number
  g: number
  b: number
}

/** 기본 민트. 이 색일 때는 디자인에서 손으로 맞춘 값을 그대로 쓴다. */
export const DEFAULT_SHELL = '#B9DEC9'

/** 클릭 한 번으로 고르는 색. 이름은 labels 의 Messages.presetNames 와 같은 순서. */
export const SHELL_PRESETS = [
  '#B9DEC9', // 민트 (기본)
  '#F1E3B0', // 버터
  '#BFD9EE', // 하늘
  '#D6CCEB', // 라벤더
  '#F2CDBE', // 복숭아
  '#3B4440' // 차콜
] as const

export function clampChannel(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number): string => clampChannel(n).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t }
}

/** WCAG 상대 휘도 */
export function luminance({ r, g, b }: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG 대비율 (1~21) */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export interface ShellTokens {
  shell: string
  shellEdge: string
  shellShade: string
  ink: string
  inkSoft: string
}

const DARK_INK: Rgb = { r: 0x22, g: 0x30, b: 0x2a }
const LIGHT_INK: Rgb = { r: 0xf6, g: 0xf4, b: 0xee }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }
const WHITE: Rgb = { r: 255, g: 255, b: 255 }

/** 본문 글자 최소 대비 (WCAG AA) */
export const MIN_TEXT_CONTRAST = 4.5

/**
 * 본체 색 → 테두리·그림자·글자 색.
 * 글자는 진한/밝은 잉크 중 대비가 큰 쪽, 그래도 4.5:1 이 안 되는 중간 톤이면 검정/흰색으로 바꾼다.
 */
export function shellTokens(hex: string): ShellTokens {
  if (hex.toUpperCase() === DEFAULT_SHELL) {
    return {
      shell: '#B9DEC9',
      shellEdge: '#8FC4AB',
      shellShade: '#A3D2BB',
      ink: '#22302A',
      inkSoft: '#4D6358'
    }
  }
  const base = hexToRgb(hex) ?? hexToRgb(DEFAULT_SHELL)!
  let ink = contrast(DARK_INK, base) >= contrast(LIGHT_INK, base) ? DARK_INK : LIGHT_INK
  if (contrast(ink, base) < MIN_TEXT_CONTRAST) {
    ink = contrast(BLACK, base) >= contrast(WHITE, base) ? BLACK : WHITE
  }
  const darkBase = ink !== DARK_INK && ink !== BLACK
  // 어두운 본체는 테두리를 밝게, 밝은 본체는 어둡게 — 어느 쪽이든 본체와 구분되게
  const edge = mix(base, darkBase ? WHITE : BLACK, 0.2)
  const shade = mix(base, darkBase ? WHITE : BLACK, 0.1)
  return {
    shell: rgbToHex(base),
    shellEdge: rgbToHex(edge),
    shellShade: rgbToHex(shade),
    ink: rgbToHex(ink),
    inkSoft: rgbToHex(mix(ink, base, 0.2))
  }
}
