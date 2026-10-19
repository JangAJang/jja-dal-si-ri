import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/ipc'
import type { Category, TimerState } from '../shared/timer'

// 렌더러에 노출하는 API. 타입은 index.d.ts 의 TimeKeeperApi 와 맞춘다.
const api = {
  getState: (): Promise<TimerState> => ipcRenderer.invoke(IPC.getState),
  start: (category: Category): Promise<void> => ipcRenderer.invoke(IPC.start, category),
  stop: (): Promise<void> => ipcRenderer.invoke(IPC.stop),
  onChanged: (listener: (state: TimerState) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: TimerState): void => listener(state)
    ipcRenderer.on(IPC.changed, handler)
    return () => ipcRenderer.removeListener(IPC.changed, handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
