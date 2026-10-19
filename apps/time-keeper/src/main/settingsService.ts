import { BrowserWindow, app, ipcMain } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { normalizeSettings, type Settings } from '../shared/settings'

/**
 * 기기별 설정의 유일한 소유자. 창이 여럿이어도(기본·미니) 설정 변경은 여기를 거쳐
 * IPC.settingsChanged 로 모든 창에 퍼진다.
 */
export class SettingsService {
  private settings: Settings
  private listeners: Array<(s: Settings) => void> = []
  private readonly path = join(app.getPath('userData'), 'settings.json')

  constructor() {
    let raw: unknown
    try {
      raw = existsSync(this.path) ? JSON.parse(readFileSync(this.path, 'utf-8')) : undefined
    } catch {
      raw = undefined // 망가진 설정 파일은 기본값으로 시작한다 (기록 파일과 달리 잃어도 되는 값)
    }
    this.settings = normalizeSettings(raw)
  }

  get current(): Settings {
    return this.settings
  }

  onChange(listener: (s: Settings) => void): void {
    this.listeners.push(listener)
  }

  register(): void {
    ipcMain.handle(IPC.getSettings, () => this.settings)
    ipcMain.handle(IPC.setSettings, (_e, patch: Partial<Settings>) => {
      this.settings = normalizeSettings({ ...this.settings, ...patch })
      const tmp = `${this.path}.tmp`
      writeFileSync(tmp, JSON.stringify(this.settings), 'utf-8')
      renameSync(tmp, this.path)
      for (const win of BrowserWindow.getAllWindows())
        win.webContents.send(IPC.settingsChanged, this.settings)
      for (const listener of this.listeners) listener(this.settings)
      return this.settings
    })
  }
}
