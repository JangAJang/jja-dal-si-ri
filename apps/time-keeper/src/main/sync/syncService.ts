// 구글 드라이브 동기화 (#7) — Electron 쪽: 키 보관(safeStorage), 브라우저 로그인, 주기 실행, IPC.
// 실제 동기화 한 바퀴는 SyncEngine, 토큰은 GoogleSession 이 한다 (둘 다 Electron 없이 테스트됨).
import { BrowserWindow, Notification, app, dialog, ipcMain, safeStorage, shell } from 'electron'
import { readdirSync, statSync } from 'fs'
import { homedir } from 'os'
import { hostname } from 'os'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '../../shared/ipc'
import {
  handoffRequests,
  incomingStop,
  liveRemotes,
  pruneStopRequests,
  type StopRequest,
  type SyncErrorCode,
  type SyncStatus
} from '../../shared/sync'
import type { Session } from '../../shared/timer'
import type { TimerService } from '../timerService'
import type { SettingsService } from '../settingsService'
import { DriveClient, DriveError, GOOGLE_DRIVE, type DriveEndpoints } from './drive'
import {
  GOOGLE_ENDPOINTS,
  OAuthError,
  buildAuthUrl,
  createPkce,
  exchangeCode,
  listenForCode,
  type OAuthClient,
  type OAuthEndpoints
} from './oauth'
import { GoogleSession } from './session'
import { SyncEngine } from './syncEngine'
import { FolderStore, FolderUnavailableError } from './store'
import { detectCloudFolders, type CloudFolder } from './cloudFolders'
import { encodeConnectionCode } from '../../shared/connectionCode'
import { DRIVE_FOLDER_NAME } from '../../shared/sync'

/**
 * 개발 중에만: TK_FAKE_GOOGLE=<가짜 서버 주소> 로 구글 대신 가짜 서버(testing/fakeGoogle.ts)에 붙는다.
 * 설치본(app.isPackaged)에서는 무시한다.
 */
function endpoints(): { oauth: OAuthEndpoints; drive: DriveEndpoints } {
  const fake = app.isPackaged ? undefined : process.env['TK_FAKE_GOOGLE']
  if (!fake) return { oauth: GOOGLE_ENDPOINTS, drive: GOOGLE_DRIVE }
  return {
    oauth: { auth: `${fake}/auth`, token: `${fake}/token` },
    drive: { api: `${fake}/drive/v3`, upload: `${fake}/upload/drive/v3` }
  }
}

/** 정기 동기화 간격 — 다른 기기의 시작을 1분 안에 알아채려고 (내용이 같으면 올리지 않는다) */
const PERIOD_MS = 60_000
/** 시작·종료 뒤 이만큼 기다렸다 올린다 (연달아 바꿀 때 한 번만) */
const AFTER_CHANGE_MS = 3_000

interface Secrets {
  clientId: string
  clientSecret?: string
  refreshToken: string
}

const userFile = (name: string): string => join(app.getPath('userData'), name)
const SECRETS_FILE = 'sync-secrets.bin'
const REMOTE_CACHE_FILE = 'remote-sessions.json'
/** 다른 기기에 보낸 끝내기 요청 (내 파일에 실어 올린다) */
const OUTBOX_FILE = 'sync-outbox.json'
/** 폴더 방식에서 고른 폴더 (#25) */
const FOLDER_CONFIG_FILE = 'sync-folder.json'

/** 마지막 동기화 결과를 기기에 남겨 두는 형식 — 껐다 켜도, 오프라인이어도 보이게 */
interface RemoteCache {
  lastSyncedAt: number
  deviceCount: number
  sessions: Session[]
}

function writeAtomic(path: string, data: string | Buffer): void {
  writeFileSync(`${path}.tmp`, data)
  renameSync(`${path}.tmp`, path)
}

/** 오류 → 사용자에게 보여줄 분류 */
function classify(e: unknown): SyncErrorCode {
  if (e instanceof OAuthError) return e.code === 'invalid_grant' ? 'needs_login' : 'login_failed'
  if (e instanceof DriveError) return e.status === 401 ? 'needs_login' : 'drive'
  if (e instanceof FolderUnavailableError) return 'folder_unavailable'
  if (e && typeof e === 'object' && 'code' in e && (e.code === 'EACCES' || e.code === 'EPERM')) {
    return 'folder_not_writable'
  }
  return 'network' // fetch 실패(TypeError) 등
}

export class SyncService {
  private secrets: Secrets | null = null
  private engine: SyncEngine | null = null
  private status: SyncStatus = {
    state: 'off',
    connected: false,
    lastSyncedAt: null,
    deviceCount: 0,
    error: null,
    clientId: null,
    mode: null,
    folderPath: null
  }
  private running: Promise<void> | null = null
  private again = false
  private changeTimer: NodeJS.Timeout | null = null
  private cancelLogin: (() => void) | null = null
  private outbox: StopRequest[] = []

  constructor(
    private readonly timer: TimerService,
    private readonly settings: SettingsService
  ) {}

  register(): void {
    ipcMain.handle(IPC.syncGetStatus, () => this.status)
    ipcMain.handle(IPC.syncConnect, (_e, client: OAuthClient) => this.connect(client))
    ipcMain.handle(IPC.syncCancel, () => this.cancelLogin?.())
    ipcMain.handle(IPC.syncDisconnect, () => this.disconnect())
    ipcMain.handle(IPC.syncNow, () => this.syncNow())
    ipcMain.handle(IPC.syncFolderCandidates, () => this.folderCandidates())
    ipcMain.handle(IPC.syncPickFolder, async (e) => {
      const parent = BrowserWindow.fromWebContents(e.sender) ?? undefined
      const options = { properties: ['openDirectory' as const, 'createDirectory' as const] }
      const r = parent
        ? await dialog.showOpenDialog(parent, options)
        : await dialog.showOpenDialog(options)
      return r.canceled ? null : (r.filePaths[0] ?? null)
    })
    ipcMain.handle(IPC.syncConnectFolder, (_e, path: string) => this.connectFolder(path))
    ipcMain.handle(IPC.syncExportCode, () =>
      this.secrets ? encodeConnectionCode(this.secrets) : null
    )

    this.loadRemoteCache()
    this.loadOutbox()
    this.secrets = this.loadSecrets()
    const folder = this.secrets ? null : this.loadFolderConfig()
    if (this.secrets) {
      this.startSession(this.secrets)
      this.setStatus({ state: 'idle', clientId: this.secrets.clientId, mode: 'google' })
      setTimeout(() => void this.syncNow(), 3_000)
    } else if (folder) {
      this.startFolder(folder)
      setTimeout(() => void this.syncNow(), 3_000)
    }
    setInterval(() => {
      if (this.engine) void this.syncNow()
    }, PERIOD_MS)
    // 이 기기 기록이 바뀌면(기록이 끝나면) 잠시 뒤 올린다
    this.timer.onChange(() => {
      if (!this.engine) return
      if (this.changeTimer) clearTimeout(this.changeTimer)
      this.changeTimer = setTimeout(() => void this.syncNow(), AFTER_CHANGE_MS)
    })
  }

  // ── 로그인 ────────────────────────────────────────────
  private async connect(client: OAuthClient): Promise<SyncStatus> {
    const clean: OAuthClient = {
      clientId: client.clientId.trim(),
      clientSecret: client.clientSecret?.trim() || undefined
    }
    if (!clean.clientId) return this.status
    if (!safeStorage.isEncryptionAvailable()) {
      return this.setStatus({ state: 'error', error: 'no_encryption' })
    }
    this.cancelLogin?.()
    this.setStatus({ state: 'connecting', error: null, clientId: clean.clientId })

    const t = this.settings.messages
    const page = (msg: string): string =>
      `<!doctype html><meta charset="utf-8"><title>${t.appName}</title>` +
      `<body style="font-family:system-ui,sans-serif;background:#b9dec9;color:#22302a;display:grid;place-items:center;height:100vh;margin:0">` +
      `<p style="font-size:18px;font-weight:700">${msg}</p></body>`
    const { verifier, challenge } = createPkce()
    const state = randomBytes(16).toString('hex')
    const listener = await listenForCode(state, {
      ok: page(t.syncBrowserOk),
      fail: page(t.syncBrowserFail)
    })
    this.cancelLogin = () => {
      listener.close()
      this.cancelLogin = null
      this.setStatus({ state: this.engine ? 'idle' : 'off', error: null })
    }
    void shell.openExternal(
      buildAuthUrl(endpoints().oauth, clean, listener.redirectUri, challenge, state)
    )

    let gotCode = false
    try {
      const code = await listener.code
      gotCode = true
      const tokens = await exchangeCode(
        endpoints().oauth,
        clean,
        code,
        verifier,
        listener.redirectUri
      )
      if (!tokens.refreshToken) throw new OAuthError('no_refresh_token', '')
      const secrets: Secrets = { ...clean, refreshToken: tokens.refreshToken }
      writeAtomic(userFile(SECRETS_FILE), safeStorage.encryptString(JSON.stringify(secrets)))
      this.secrets = secrets
      this.startSession(secrets)
      this.cancelLogin = null
      this.setStatus({ state: 'idle', error: null, mode: 'google', folderPath: null })
      void this.syncNow()
    } catch (e) {
      if (this.status.state !== 'connecting') return this.status // 취소됨
      this.cancelLogin = null
      // 브라우저 단계(거절·시간 초과·state 불일치)에서 끝났으면 취소, 코드를 받은 뒤면 교환 오류
      this.setStatus({ state: 'error', error: gotCode ? classify(e) : 'login_cancelled' })
    }
    return this.status
  }

  private startSession(secrets: Secrets): void {
    const session = new GoogleSession(secrets, secrets.refreshToken, endpoints().oauth)
    const drive = new DriveClient(session.accessToken, endpoints().drive, fetch, () =>
      session.invalidate()
    )
    this.engine = new SyncEngine(drive, this.timer.deviceId)
  }

  // ── 폴더 방식 (#25) ─────────────────────────────────────
  /** 이 컴퓨터에 있는 클라우드 동기화 폴더 (원클릭 후보) */
  private folderCandidates(): CloudFolder[] {
    return detectCloudFolders({
      platform: process.platform,
      home: homedir(),
      env: process.env,
      isDir: (p) => {
        try {
          return statSync(p).isDirectory()
        } catch {
          return false
        }
      },
      list: (p) => {
        try {
          return readdirSync(p)
        } catch {
          return []
        }
      }
    })
  }

  /** 고른 폴더로 연결: 쓸 수 있는지 먼저 확인하고, 그 안의 앱 폴더에 기기 파일을 둔다 */
  private async connectFolder(root: string): Promise<SyncStatus> {
    try {
      const probe = join(root, `.jjadalsiri-write-test-${randomBytes(3).toString('hex')}`)
      writeFileSync(probe, '')
      rmSync(probe, { force: true })
    } catch (e) {
      const missing = !!e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT'
      return this.setStatus({
        state: 'error',
        error: missing ? 'folder_unavailable' : 'folder_not_writable'
      })
    }
    if (this.secrets) await this.disconnect() // 한 번에 한 방식만
    writeAtomic(userFile(FOLDER_CONFIG_FILE), JSON.stringify({ path: root }))
    this.startFolder(root)
    void this.syncNow()
    return this.status
  }

  private startFolder(root: string): void {
    this.engine = new SyncEngine(new FolderStore(root), this.timer.deviceId)
    this.setStatus({
      state: 'idle',
      error: null,
      mode: 'folder',
      folderPath: join(root, DRIVE_FOLDER_NAME),
      clientId: null
    })
  }

  private loadFolderConfig(): string | null {
    try {
      const path = userFile(FOLDER_CONFIG_FILE)
      if (!existsSync(path)) return null
      const o = JSON.parse(readFileSync(path, 'utf-8')) as { path?: unknown }
      return typeof o.path === 'string' && o.path ? o.path : null
    } catch {
      return null
    }
  }

  /** 연결 끊기: 이 기기의 키·토큰·받아 둔 다른 기기 기록을 지운다. 드라이브·폴더의 파일은 그대로 둔다. */
  private async disconnect(): Promise<SyncStatus> {
    this.cancelLogin?.()
    const token = this.secrets?.refreshToken
    this.secrets = null
    this.engine = null
    rmSync(userFile(SECRETS_FILE), { force: true })
    rmSync(userFile(REMOTE_CACHE_FILE), { force: true })
    rmSync(userFile(OUTBOX_FILE), { force: true })
    rmSync(userFile(FOLDER_CONFIG_FILE), { force: true })
    this.outbox = []
    this.timer.setRemoteSessions([])
    // 구글 쪽 권한도 철회 (실패해도 이 기기에서는 이미 끊김)
    if (token) {
      void fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST'
      }).catch(() => {})
    }
    return this.setStatus({
      state: 'off',
      error: null,
      lastSyncedAt: null,
      deviceCount: 0,
      clientId: null,
      mode: null,
      folderPath: null
    })
  }

  // ── 동기화 ────────────────────────────────────────────
  /** 동시에 한 번만 돈다. 도는 중에 또 요청되면 끝난 뒤 한 번 더. */
  private syncNow(): Promise<void> {
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = this.runOnce().finally(() => {
      this.running = null
      if (this.again) {
        this.again = false
        void this.syncNow()
      }
    })
    return this.running
  }

  private async runOnce(): Promise<void> {
    const engine = this.engine
    if (!engine || this.status.state === 'connecting') return
    this.setStatus({ state: 'syncing' })
    try {
      const now = Date.now()
      this.outbox = pruneStopRequests(this.outbox, now)
      const result = await engine.run(
        {
          sessions: this.timer.ownSessions,
          active: this.timer.active,
          deviceName: hostname(),
          stopRequests: this.outbox
        },
        now
      )
      if (engine !== this.engine) return // 도중에 연결 끊김
      this.applyHandoff(result.remoteFiles, now)
      this.timer.setRemoteSessions(result.remoteSessions)
      const syncedAt = Date.now()
      const cache: RemoteCache = {
        lastSyncedAt: syncedAt,
        deviceCount: result.deviceCount,
        sessions: result.remoteSessions
      }
      writeAtomic(userFile(REMOTE_CACHE_FILE), JSON.stringify(cache))
      this.setStatus({
        state: 'idle',
        error: null,
        lastSyncedAt: syncedAt,
        deviceCount: result.deviceCount
      })
    } catch (e) {
      if (engine !== this.engine) return
      this.setStatus({ state: 'error', error: classify(e) })
    }
  }

  // ── 이어받기 ──────────────────────────────────────────
  /**
   * 1) 다른 기기가 "네 기록 끝내" 요청을 보냈으면 그 시각으로 끝낸다.
   * 2) 내가 나중에 시작했는데 다른 기기 타이머가 아직 돌면 끝내기 요청을 보낸다 (설정이 켜져 있을 때).
   */
  private applyHandoff(remoteFiles: Parameters<typeof liveRemotes>[0], now: number): void {
    const t = this.settings.messages
    const deviceId = this.timer.deviceId

    const incoming = incomingStop(remoteFiles, deviceId, this.timer.active)
    const active = this.timer.active
    if (incoming && active && this.timer.stopAt(active.id, incoming.endAt)) {
      const time = new Date(incoming.endAt).toLocaleTimeString(this.settings.locale, {
        hour: 'numeric',
        minute: '2-digit'
      })
      this.notify(
        t.handoffReceivedTitle,
        t.handoffReceivedBody(incoming.fromDeviceName, t.category[active.category], time)
      )
    }

    if (!this.settings.snapshot.autoHandoff) return
    const live = liveRemotes(remoteFiles, deviceId, now)
    const requests = handoffRequests(
      { deviceId, active: this.timer.active },
      live,
      this.outbox,
      now
    )
    if (requests.length === 0) return
    this.outbox = [...this.outbox, ...requests]
    writeAtomic(userFile(OUTBOX_FILE), JSON.stringify(this.outbox))
    for (const r of requests) {
      const remote = live.find((l) => l.deviceId === r.deviceId)
      if (remote)
        this.notify(
          t.handoffSentTitle,
          t.handoffSentBody(remote.deviceName, t.category[remote.active.category])
        )
    }
    this.again = true // 요청을 바로 올리도록 한 바퀴 더
  }

  private notify(title: string, body: string): void {
    if (Notification.isSupported()) new Notification({ title, body }).show()
  }

  private loadOutbox(): void {
    try {
      const path = userFile(OUTBOX_FILE)
      if (existsSync(path)) {
        const raw = JSON.parse(readFileSync(path, 'utf-8')) as StopRequest[]
        this.outbox = Array.isArray(raw) ? raw : []
      }
    } catch {
      this.outbox = []
    }
  }

  // ── 저장 ─────────────────────────────────────────────
  private loadSecrets(): Secrets | null {
    const path = userFile(SECRETS_FILE)
    if (!existsSync(path) || !safeStorage.isEncryptionAvailable()) return null
    try {
      const s = JSON.parse(safeStorage.decryptString(readFileSync(path))) as Secrets
      return s.clientId && s.refreshToken ? s : null
    } catch {
      return null
    }
  }

  /** 마지막으로 받은 다른 기기 기록 — 오프라인에서도 통계에 보이게 */
  private loadRemoteCache(): void {
    try {
      const path = userFile(REMOTE_CACHE_FILE)
      if (!existsSync(path)) return
      const cache = JSON.parse(readFileSync(path, 'utf-8')) as RemoteCache
      if (!Array.isArray(cache.sessions)) return
      this.timer.setRemoteSessions(cache.sessions)
      this.status = {
        ...this.status,
        lastSyncedAt: cache.lastSyncedAt,
        deviceCount: cache.deviceCount
      }
    } catch {
      // 캐시는 다음 동기화 때 다시 받는다
    }
  }

  private setStatus(patch: Partial<SyncStatus>): SyncStatus {
    this.status = { ...this.status, ...patch, connected: this.engine !== null }
    for (const win of BrowserWindow.getAllWindows())
      win.webContents.send(IPC.syncStatus, this.status)
    return this.status
  }
}
