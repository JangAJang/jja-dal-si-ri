// main·preload 가 함께 쓰는 IPC 채널 이름.
export const IPC = {
  /** main → renderer: 패널이 보이는지 (boolean). 숨겨지면 게임을 멈춘다. */
  visibility: 'panel:visibility'
} as const
