// 기기별 설정 (#21). 기록 파일(동기화 대상)과 분리해 userData/settings.json 에 둔다.
import { DEFAULT_SHELL, hexToRgb, rgbToHex } from './theme'

export interface Settings {
  version: 1
  /** 본체 색 #RRGGBB */
  shellColor: string
  /** 타이머 탭의 오늘의 성적표 접힘 */
  reportCollapsed: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  shellColor: DEFAULT_SHELL,
  reportCollapsed: false
}

/** 파일·IPC 로 들어온 값을 믿지 않고 항목별로 검사해 기본값으로 채운다. */
export function normalizeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const color = typeof o.shellColor === 'string' ? hexToRgb(o.shellColor) : null
  return {
    version: 1,
    shellColor: color ? rgbToHex(color) : DEFAULT_SETTINGS.shellColor,
    reportCollapsed:
      typeof o.reportCollapsed === 'boolean' ? o.reportCollapsed : DEFAULT_SETTINGS.reportCollapsed
  }
}
