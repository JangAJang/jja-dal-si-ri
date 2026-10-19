// main ↔ preload 가 공유하는 IPC 채널 이름. 새 채널은 여기에 먼저 추가한다.
export const IPC = {
  getState: 'timer:getState',
  start: 'timer:start',
  stop: 'timer:stop',
  changed: 'timer:changed',
  openView: 'window:openView',
  getAlwaysOnTop: 'window:getAlwaysOnTop',
  setAlwaysOnTop: 'window:setAlwaysOnTop',
  dragStart: 'window:dragStart',
  dragEnd: 'window:dragEnd'
} as const
