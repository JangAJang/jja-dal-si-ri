import { ElectronAPI } from '@electron-toolkit/preload'
import type { Category, TimerState } from '../shared/timer'

export interface TimeKeeperApi {
  getState: () => Promise<TimerState>
  start: (category: Category) => Promise<void>
  stop: () => Promise<void>
  /** 상태 변경 구독. 반환된 함수를 호출하면 구독 해제. */
  onChanged: (listener: (state: TimerState) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TimeKeeperApi
  }
}
