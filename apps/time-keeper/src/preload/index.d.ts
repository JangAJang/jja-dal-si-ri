import { ElectronAPI } from '@electron-toolkit/preload'
import type { Category, TimerState } from '../shared/timer'
import type { ViewMode } from '../shared/view'
import type { Settings } from '../shared/settings'

export interface TimeKeeperApi {
  getState: () => Promise<TimerState>
  start: (category: Category) => Promise<void>
  stop: () => Promise<void>
  /** 상태 변경 구독. 반환된 함수를 호출하면 구독 해제. */
  onChanged: (listener: (state: TimerState) => void) => () => void
  /** 기본/디지털 미니/아날로그 미니 창으로 전환 (나머지 창은 숨김). */
  openView: (mode: ViewMode) => Promise<void>
  /** 이 창의 항상 위 상태. */
  getAlwaysOnTop: () => Promise<boolean>
  setAlwaysOnTop: (value: boolean) => Promise<boolean>
  /** 미니 창 직접 드래그 시작/끝. */
  dragStart: () => void
  dragEnd: () => void
  /** 기기별 설정. set 은 바꿀 항목만 넘기고, 정리된 전체 설정을 돌려받는다. */
  getSettings: () => Promise<Settings>
  setSettings: (patch: Partial<Settings>) => Promise<Settings>
  onSettingsChanged: (listener: (s: Settings) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TimeKeeperApi
  }
}
