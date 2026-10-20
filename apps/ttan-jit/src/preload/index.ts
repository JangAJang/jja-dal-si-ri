import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/ipc'
import type { SavedGames } from '../shared/games'

const api = {
  /** 패널이 보이거나 숨겨질 때마다 불린다. 해제 함수를 돌려준다. */
  onVisibility(listener: (visible: boolean) => void): () => void {
    const handler = (_: unknown, visible: boolean): void => listener(visible)
    ipcRenderer.on(IPC.visibility, handler)
    return () => ipcRenderer.off(IPC.visibility, handler)
  },
  loadGames(): Promise<SavedGames> {
    return ipcRenderer.invoke(IPC.loadGames)
  },
  saveGames(data: SavedGames): void {
    ipcRenderer.send(IPC.saveGames, data)
  }
}

export type Api = typeof api

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
