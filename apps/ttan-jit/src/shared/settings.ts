// 기기별 설정 형식 (userData/settings.json, docs/design.md > 설정). 게임 저장과는 다른 파일이다.
import { DEFAULT_CORNER, DEFAULT_DWELL_MS, PANEL_SIZE, type Corner, type Size } from './hotzone'
import type { Language, Locale } from './labels'

export type PanelSize = 'small' | 'medium' | 'large'

export interface Settings {
  version: 1
  /** 핫존을 둘 모니터 (Electron display.id). null 이면 주 모니터. 고른 모니터가 없어져도 주 모니터로. */
  displayId: number | null
  corner: Corner
  /** 모서리에 이만큼 머물면 패널이 뜬다. */
  dwellMs: number
  panelSize: PanelSize
  showTray: boolean
  /** 화면 공유·녹화·스크린샷에 패널이 찍히지 않게. */
  contentProtection: boolean
  /** 스도쿠 틀린 칸 빨간 표시. */
  showErrors: boolean
  language: Language
}

/** main 이 OS 언어까지 따져 정한 실제 언어를 붙여서 렌더러에 보낸다 (렌더러는 OS 언어를 모른다). */
export interface ResolvedSettings extends Settings {
  locale: Locale
}

export const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
export const PANEL_SIZES: PanelSize[] = ['small', 'medium', 'large']
export const LANGUAGES: Language[] = ['system', 'ko', 'en']
export const DWELL_MIN_MS = 200
export const DWELL_MAX_MS = 1500

/** 패널 크기 → 배율. 화면은 CSS zoom 으로, 창은 기본 크기 × 배율로 키운다. */
export const PANEL_SCALE: Record<PanelSize, number> = { small: 0.85, medium: 1, large: 1.2 }

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  displayId: null,
  corner: DEFAULT_CORNER,
  dwellMs: DEFAULT_DWELL_MS,
  panelSize: 'medium',
  showTray: true,
  contentProtection: true,
  showErrors: true,
  language: 'system'
}

export function panelSizeOf(s: Settings): Size {
  const k = PANEL_SCALE[s.panelSize]
  return { width: Math.round(PANEL_SIZE.width * k), height: Math.round(PANEL_SIZE.height * k) }
}

/** 저장 파일·렌더러에서 온 값을 검사한다. 모르는 값은 기본값으로. */
export function normalizeSettings(raw: unknown): Settings {
  const s = raw && typeof raw === 'object' ? (raw as Partial<Settings>) : {}
  const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d)
  const dwell =
    typeof s.dwellMs === 'number' && Number.isFinite(s.dwellMs)
      ? Math.min(DWELL_MAX_MS, Math.max(DWELL_MIN_MS, Math.round(s.dwellMs)))
      : DEFAULT_SETTINGS.dwellMs
  return {
    version: 1,
    displayId: typeof s.displayId === 'number' && Number.isFinite(s.displayId) ? s.displayId : null,
    corner: CORNERS.includes(s.corner as Corner) ? (s.corner as Corner) : DEFAULT_SETTINGS.corner,
    dwellMs: dwell,
    panelSize: PANEL_SIZES.includes(s.panelSize as PanelSize)
      ? (s.panelSize as PanelSize)
      : DEFAULT_SETTINGS.panelSize,
    showTray: bool(s.showTray, DEFAULT_SETTINGS.showTray),
    contentProtection: bool(s.contentProtection, DEFAULT_SETTINGS.contentProtection),
    showErrors: bool(s.showErrors, DEFAULT_SETTINGS.showErrors),
    language: LANGUAGES.includes(s.language as Language)
      ? (s.language as Language)
      : DEFAULT_SETTINGS.language
  }
}
