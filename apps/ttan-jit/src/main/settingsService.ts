import { BrowserWindow, app, ipcMain } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { MESSAGES, resolveLocale, type Messages } from '../shared/labels'
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type ResolvedSettings,
  type Settings
} from '../shared/settings'

// 기기별 설정의 유일한 주인. 바뀌면 파일에 쓰고, 모든 창과 main 구독자(패널·트레이·설정 창)에 알린다.
const filePath = (): string => join(app.getPath('userData'), 'settings.json')

let current: Settings = DEFAULT_SETTINGS
const listeners: ((s: ResolvedSettings) => void)[] = []

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

function systemLanguage(): string {
  return app.getPreferredSystemLanguages()[0] ?? app.getLocale()
}

export function getSettings(): ResolvedSettings {
  return { ...current, locale: resolveLocale(current.language, systemLanguage()) }
}

/** main 쪽 문구(트레이·창 제목)는 이걸로. */
export function messages(): Messages {
  return MESSAGES[getSettings().locale]
}

export function onSettingsChange(listener: (s: ResolvedSettings) => void): void {
  listeners.push(listener)
}

export function updateSettings(patch: Partial<Settings>): ResolvedSettings {
  current = normalizeSettings({ ...current, ...patch })
  write(current)
  const resolved = getSettings()
  for (const l of listeners) l(resolved)
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC.settingsChanged, resolved)
  return resolved
}

export function startSettings(): void {
  current = load()
  ipcMain.handle(IPC.getSettings, () => getSettings())
  ipcMain.handle(IPC.setSettings, (_, patch: unknown) =>
    updateSettings(patch && typeof patch === 'object' ? (patch as Partial<Settings>) : {})
  )
}
