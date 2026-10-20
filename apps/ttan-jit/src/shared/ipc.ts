// main·preload 가 함께 쓰는 IPC 채널 이름.
export const IPC = {
  /** main → renderer: 패널이 보이는지 (boolean). 숨겨지면 게임을 멈춘다. */
  visibility: 'panel:visibility',
  /** renderer → main (invoke): 저장된 게임 읽기 → SavedGames */
  loadGames: 'games:load',
  /** renderer → main: 게임 저장 (SavedGames). main 이 모아서 쓴다. */
  saveGames: 'games:save'
} as const
