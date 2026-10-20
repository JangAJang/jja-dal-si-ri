import { BrowserWindow, ipcMain, screen } from 'electron'
import type { DisplayInfo } from '../shared/displays'
import { IPC } from '../shared/ipc'

// 모니터 목록 (#45). 설정 창은 이걸로 배치 그림을 그리고, 패널은 고른 모니터를 찾는다.
export function listDisplays(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    bounds: d.bounds,
    primary: d.id === primary,
    label: d.label ?? ''
  }))
}

/** 모니터를 꽂거나 뽑거나 배치·배율이 바뀌면 모든 창에 알리고 onChange 를 부른다. */
export function startDisplays(onChange: () => void): void {
  ipcMain.handle(IPC.getDisplays, () => listDisplays())
  const changed = (): void => {
    const all = listDisplays()
    for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC.displaysChanged, all)
    onChange()
  }
  screen.on('display-added', changed)
  screen.on('display-removed', changed)
  screen.on('display-metrics-changed', changed)
}
