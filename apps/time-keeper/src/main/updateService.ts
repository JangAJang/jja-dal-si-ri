// 새 버전 알림 (#9): GitHub Releases 에서 이 앱의 더 높은 정식 릴리스를 찾아 창·트레이에 알린다.
// 자동 설치는 하지 않는다 — 서명하지 않은 macOS 앱은 자동 업데이트가 안 돼 두 OS 동작을 맞춘다.
import { BrowserWindow, app, ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import { findUpdate, type GitHubRelease, type UpdateInfo } from '../shared/update'
import type { SettingsService } from './settingsService'

const RELEASES_URL = 'https://api.github.com/repos/JangAJang/jja-dal-si-ri/releases?per_page=50'
const FIRST_CHECK_MS = 10_000
const PERIOD_MS = 12 * 60 * 60_000

/** 개발 중에만: TK_RELEASES_URL 로 가짜 릴리스 목록을 쓴다 (설치본에서는 무시) */
function releasesUrl(): string {
  return (!app.isPackaged && process.env['TK_RELEASES_URL']) || RELEASES_URL
}

export class UpdateService {
  private update: UpdateInfo | null = null
  private listeners: Array<(u: UpdateInfo | null) => void> = []

  constructor(private readonly settings: SettingsService) {}

  /** 알릴 새 버전 ("나중에"로 넘긴 버전이면 null) */
  get visible(): UpdateInfo | null {
    return this.update && this.update.version !== this.settings.snapshot.dismissedUpdate
      ? this.update
      : null
  }

  onChange(listener: (u: UpdateInfo | null) => void): void {
    this.listeners.push(listener)
  }

  register(): void {
    ipcMain.handle(IPC.updateGet, () => this.visible)
    ipcMain.handle(IPC.updateDismiss, () => {
      if (this.update) this.settings.update({ dismissedUpdate: this.update.version })
    })
    // "나중에"로 설정이 바뀌면 창·트레이에서 알림을 내린다
    this.settings.onChange(() => this.broadcast())
    setTimeout(() => void this.check(), FIRST_CHECK_MS)
    setInterval(() => void this.check(), PERIOD_MS)
  }

  async check(): Promise<void> {
    try {
      const res = await fetch(releasesUrl(), {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'jjadalsiri-timer' }
      })
      if (!res.ok) return // 요청 한도·네트워크 문제 — 조용히 다음 확인 때
      const releases = (await res.json()) as GitHubRelease[]
      if (!Array.isArray(releases)) return
      this.update = findUpdate(releases, app.getVersion())
      this.broadcast()
    } catch {
      // 오프라인 등 — 알림은 부가 기능이라 사용자에게 오류를 보이지 않는다
    }
  }

  private broadcast(): void {
    const u = this.visible
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.updateChanged, u)
    for (const l of this.listeners) l(u)
  }
}
