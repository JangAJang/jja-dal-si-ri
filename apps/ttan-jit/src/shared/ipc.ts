// main·preload 가 함께 쓰는 IPC 채널 이름.
export const IPC = {
  /** main → renderer: 패널이 보이는지 (boolean). 숨겨지면 게임을 멈춘다. */
  visibility: 'panel:visibility',
  /** renderer → main (invoke): 저장된 게임 읽기 → SavedGames */
  loadGames: 'games:load',
  /** renderer → main: 게임 저장 (SavedGames). main 이 모아서 쓴다. */
  saveGames: 'games:save',
  /** renderer → main (invoke): 설정 읽기 → Settings */
  getSettings: 'settings:get',
  /** renderer → main (invoke): 설정 일부 바꾸기 (Partial<Settings>) → Settings */
  setSettings: 'settings:set',
  /** main → 모든 창: 설정이 바뀌었다 (Settings) */
  settingsChanged: 'settings:changed',
  /** renderer → main (invoke): 모니터 목록 → DisplayInfo[] */
  getDisplays: 'displays:get',
  /** main → 모든 창: 모니터를 꽂거나 뽑거나 배치가 바뀌었다 (DisplayInfo[]) */
  displaysChanged: 'displays:changed',
  /** renderer → main: 설정 창 열기 */
  openSettings: 'settings:open',
  /** renderer → main: 앱 종료 */
  quit: 'app:quit'
} as const
