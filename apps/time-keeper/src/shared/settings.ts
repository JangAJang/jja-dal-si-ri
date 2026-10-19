// 기기별 설정 (#21). 기록 파일(동기화 대상)과 분리해 userData/settings.json 에 둔다.
import { LOCALES, type Locale } from './labels'
import { DEFAULT_SHELL, hexToRgb, rgbToHex } from './theme'

export type LocalePreference = 'auto' | Locale

export interface Settings {
  version: 1
  /** 본체 색 #RRGGBB */
  shellColor: string
  /** 타이머 탭의 오늘의 성적표 접힘 */
  reportCollapsed: boolean
  /** 화면 언어. auto 는 시스템 언어를 따른다 (#8) */
  locale: LocalePreference
  /** 다른 컴퓨터에서 도는 타이머를 여기서 시작할 때 자동으로 끝내기 (#7 이어받기) */
  autoHandoff: boolean
}

/** main 이 렌더러에 보내는 설정: 저장된 값 + 실제로 쓸 언어(auto 를 풀어낸 값). */
export interface SettingsSnapshot extends Settings {
  resolvedLocale: Locale
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  shellColor: DEFAULT_SHELL,
  reportCollapsed: false,
  locale: 'auto',
  autoHandoff: true
}

const LOCALE_PREFERENCES: readonly string[] = ['auto', ...LOCALES]

/** 파일·IPC 로 들어온 값을 믿지 않고 항목별로 검사해 기본값으로 채운다. */
export function normalizeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const color = typeof o.shellColor === 'string' ? hexToRgb(o.shellColor) : null
  return {
    version: 1,
    shellColor: color ? rgbToHex(color) : DEFAULT_SETTINGS.shellColor,
    reportCollapsed:
      typeof o.reportCollapsed === 'boolean' ? o.reportCollapsed : DEFAULT_SETTINGS.reportCollapsed,
    locale:
      typeof o.locale === 'string' && LOCALE_PREFERENCES.includes(o.locale)
        ? (o.locale as LocalePreference)
        : DEFAULT_SETTINGS.locale,
    autoHandoff: typeof o.autoHandoff === 'boolean' ? o.autoHandoff : DEFAULT_SETTINGS.autoHandoff
  }
}
