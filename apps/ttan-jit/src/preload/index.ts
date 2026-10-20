import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '../shared/ipc'
import type { SavedGames } from '../shared/games'
import type { Settings } from '../shared/settings'

/** main → renderer 방송을 구독한다. 해제 함수를 돌려준다. */
function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_: unknown, value: T): void => listener(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

const api = {
  /** 패널이 보이거나 숨겨질 때마다 불린다. */
  onVisibility: (listener: (visible: boolean) => void) => subscribe(IPC.visibility, listener),
  loadGames(): Promise<SavedGames> {
    return ipcRenderer.invoke(IPC.loadGames)
  },
  saveGames(data: SavedGames): void {
    ipcRenderer.send(IPC.saveGames, data)
  },
  getSettings(): Promise<Settings> {
    return ipcRenderer.invoke(IPC.getSettings)
  },
  setSettings(patch: Partial<Settings>): Promise<Settings> {
    return ipcRenderer.invoke(IPC.setSettings, patch)
  },
  onSettings: (listener: (s: Settings) => void) => subscribe(IPC.settingsChanged, listener),
  openSettings(): void {
    ipcRenderer.send(IPC.openSettings)
  },
  quit(): void {
    ipcRenderer.send(IPC.quit)
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
