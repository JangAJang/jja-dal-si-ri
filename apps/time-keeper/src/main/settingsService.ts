import { BrowserWindow, app, ipcMain } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import { MESSAGES, resolveLocale, type Locale, type Messages } from '../shared/labels'
import { normalizeSettings, type Settings, type SettingsSnapshot } from '../shared/settings'

/** OS 가 알려주는 사용자 선호 언어(첫 번째). 없으면 앱 로케일. */
function systemLanguage(): string {
  return app.getPreferredSystemLanguages()[0] ?? app.getLocale()
}

/**
 * 기기별 설정의 유일한 소유자. 창이 여럿이어도(기본·미니) 설정 변경은 여기를 거쳐
 * IPC.settingsChanged 로 모든 창에 퍼진다. main 쪽 문구(트레이·대화상자)도 여기서 언어를 정한다.
 */
export class SettingsService {
  private settings: Settings
  private listeners: Array<(s: SettingsSnapshot) => void> = []
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

  get locale(): Locale {
    return resolveLocale(this.settings.locale, systemLanguage())
  }

  /** main 프로세스 문구 (트레이·종료 확인창·창 제목) */
  get messages(): Messages {
    return MESSAGES[this.locale]
  }

  get snapshot(): SettingsSnapshot {
    return { ...this.settings, resolvedLocale: this.locale }
  }

  onChange(listener: (s: SettingsSnapshot) => void): void {
    this.listeners.push(listener)
  }

  register(): void {
    ipcMain.handle(IPC.getSettings, () => this.snapshot)
    ipcMain.handle(IPC.setSettings, (_e, patch: Partial<Settings>) => this.update(patch))
  }

  /** 설정 바꾸기 (렌더러 IPC·main 양쪽에서): 검증 → 저장 → 모든 창·구독자에게 알림 */
  update(patch: Partial<Settings>): SettingsSnapshot {
    this.settings = normalizeSettings({ ...this.settings, ...patch })
    const tmp = `${this.path}.tmp`
    writeFileSync(tmp, JSON.stringify(this.settings), 'utf-8')
    renameSync(tmp, this.path)
    const snapshot = this.snapshot
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send(IPC.settingsChanged, snapshot)
    for (const listener of this.listeners) listener(snapshot)
    return snapshot
  }
}
