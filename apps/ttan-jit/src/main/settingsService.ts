import { BrowserWindow, app, ipcMain } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../shared/settings'

// 기기별 설정의 유일한 주인. 바뀌면 파일에 쓰고, 모든 창과 main 구독자(패널·트레이)에 알린다.
const filePath = (): string => join(app.getPath('userData'), 'settings.json')

let current: Settings = DEFAULT_SETTINGS
const listeners: ((s: Settings) => void)[] = []

function load(): Settings {
  try {
    const path = filePath()
    return existsSync(path)
      ? normalizeSettings(JSON.parse(readFileSync(path, 'utf-8')))
      : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function write(s: Settings): void {
  const path = filePath()
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(s), 'utf-8')
  renameSync(tmp, path)
}

export function getSettings(): Settings {
  return current
}

export function onSettingsChange(listener: (s: Settings) => void): void {
  listeners.push(listener)
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = normalizeSettings({ ...current, ...patch })
  write(current)
  for (const l of listeners) l(current)
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC.settingsChanged, current)
  return current
}

export function startSettings(): void {
  current = load()
  ipcMain.handle(IPC.getSettings, () => current)
  ipcMain.handle(IPC.setSettings, (_, patch: unknown) =>
    updateSettings(patch && typeof patch === 'object' ? (patch as Partial<Settings>) : {})
  )
}
