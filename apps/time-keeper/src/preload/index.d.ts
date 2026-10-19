import { ElectronAPI } from '@electron-toolkit/preload'
import type { Category, TimerState } from '../shared/timer'
import type { ViewMode } from '../shared/view'
import type { Settings, SettingsSnapshot } from '../shared/settings'
import type { SyncStatus } from '../shared/sync'

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
  /** 이 창의 내용 높이를 맞춘다. null 이면 처음 높이로 (처음보다 커지지 않음). */
  fitHeight: (height: number | null) => Promise<void>
  /** 기기별 설정. set 은 바꿀 항목만 넘기고, 정리된 전체 설정을 돌려받는다. */
  getSettings: () => Promise<SettingsSnapshot>
  setSettings: (patch: Partial<Settings>) => Promise<SettingsSnapshot>
  onSettingsChanged: (listener: (s: SettingsSnapshot) => void) => () => void
  /** 구글 드라이브 동기화 (#7). 연결은 브라우저 로그인이 끝날 때까지 기다린다. */
  syncGetStatus: () => Promise<SyncStatus>
  syncConnect: (client: { clientId: string; clientSecret?: string }) => Promise<SyncStatus>
  syncCancel: () => Promise<void>
  syncDisconnect: () => Promise<SyncStatus>
  syncNow: () => Promise<void>
  onSyncStatus: (listener: (s: SyncStatus) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TimeKeeperApi
  }
}
