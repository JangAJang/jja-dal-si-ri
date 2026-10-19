// 구글 드라이브 동기화(#7)의 파일 형식과 병합 규칙. 순수 함수만.
//
// 각 기기는 드라이브의 앱 폴더에 자기 파일(sessions-<deviceId>.json) 하나만 쓴다.
// 다른 기기 파일은 읽기만 한다. 그래서 여러 기기가 동시에 써도 서로 덮어쓰지 않는다.
//
// 이어받기(#7): 한 사람이 한 번에 하나만 기록한다는 규칙을 기기 사이로 넓힌다.
// 다른 기기에서 타이머가 도는 중에 여기서 시작하면, 나중에 시작한 쪽(여기)이 자기 파일에
// "그 기록을 내가 시작한 시각에 끝내 줘" 요청을 적고, 저쪽은 다음 동기화 때 그 시각으로 끝낸다.
import type { Category, Session } from './timer'

/** 이 시간 안에 확인된(heartbeat) 진행 중 기록만 "지금 도는 중"으로 본다. 꺼진 기기의 유령 방지. */
export const LIVE_WINDOW_MS = 7 * 60_000
/** 진행 중일 때는 내용이 같아도 이 간격마다 다시 올려 "아직 도는 중"을 알린다 (< LIVE_WINDOW_MS) */
export const HEARTBEAT_UPLOAD_MS = 4 * 60_000
/** 끝내 달라는 요청은 이만큼 지나면 버린다 */
export const STOP_REQUEST_TTL_MS = 24 * 60 * 60_000

/** 다른 기기에 알리는 진행 중 기록 */
export interface RemoteActive {
  id: string
  category: Category
  startedAt: number
  /** 이 상태를 마지막으로 올린 시각 */
  heartbeatAt: number
}

/** "그 기기의 그 기록을 endAt 에 끝내 줘" — 요청한 기기 파일에 들어 있다 */
export interface StopRequest {
  deviceId: string
  sessionId: string
  endAt: number
  requestedAt: number
}

/** 드라이브에 만드는 폴더 이름. drive.file 권한이라 이 앱이 만든 폴더·파일만 보인다. */
export const DRIVE_FOLDER_NAME = 'Jjadalsiri Timer'

const FILE_PREFIX = 'sessions-'
const FILE_SUFFIX = '.json'

/** 드라이브에 올리는 기기별 파일 */
export interface DeviceFile {
  version: 1
  deviceId: string
  /** 올린 시각 epoch ms */
  updatedAt: number
  /** 이 기기에서 끝난 기록들 */
  sessions: Session[]
  /** 컴퓨터 이름 (알림에 쓴다) */
  deviceName?: string
  /** 지금 도는 기록 */
  active?: RemoteActive | null
  /** 다른 기기에 보내는 끝내기 요청 */
  stopRequests?: StopRequest[]
}

export function deviceFileName(deviceId: string): string {
  return `${FILE_PREFIX}${deviceId}${FILE_SUFFIX}`
}

/** 파일 이름 → 기기 ID. 이 앱의 기록 파일이 아니면 null. */
export function deviceIdFromFileName(name: string): string | null {
  if (!name.startsWith(FILE_PREFIX) || !name.endsWith(FILE_SUFFIX)) return null
  const id = name.slice(FILE_PREFIX.length, -FILE_SUFFIX.length)
  return id.length > 0 ? id : null
}

const isSession = (s: unknown): s is Session => {
  const o = s as Record<string, unknown>
  return (
    !!o &&
    typeof o.id === 'string' &&
    (o.category === 'work' || o.category === 'break' || o.category === 'study') &&
    typeof o.startedAt === 'number' &&
    typeof o.endedAt === 'number' &&
    o.endedAt >= o.startedAt
  )
}

const isCategory = (c: unknown): c is Category => c === 'work' || c === 'break' || c === 'study'

const isActive = (a: unknown): a is RemoteActive => {
  const o = a as Record<string, unknown>
  return (
    !!o &&
    typeof o.id === 'string' &&
    isCategory(o.category) &&
    typeof o.startedAt === 'number' &&
    typeof o.heartbeatAt === 'number'
  )
}

const isStopRequest = (r: unknown): r is StopRequest => {
  const o = r as Record<string, unknown>
  return (
    !!o &&
    typeof o.deviceId === 'string' &&
    typeof o.sessionId === 'string' &&
    typeof o.endAt === 'number' &&
    typeof o.requestedAt === 'number'
  )
}

/** 내려받은 파일을 믿지 않고 검사한다. 형식이 틀린 기록은 버리고, 파일 자체가 틀리면 null. */
export function parseDeviceFile(text: string): DeviceFile | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  const o = raw as Record<string, unknown>
  if (!o || o.version !== 1 || typeof o.deviceId !== 'string' || !Array.isArray(o.sessions)) {
    return null
  }
  return {
    version: 1,
    deviceId: o.deviceId,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : 0,
    sessions: o.sessions.filter(isSession),
    deviceName: typeof o.deviceName === 'string' ? o.deviceName.slice(0, 64) : undefined,
    active: isActive(o.active) ? o.active : null,
    stopRequests: Array.isArray(o.stopRequests) ? o.stopRequests.filter(isStopRequest) : []
  }
}

/** 한 기기의 파일이 여러 개 보일 때(폴더 경쟁의 흔적) 가장 최근 것만 */
function latestPerDevice(files: DeviceFile[]): DeviceFile[] {
  const byDevice = new Map<string, DeviceFile>()
  for (const f of files) {
    const prev = byDevice.get(f.deviceId)
    if (!prev || f.updatedAt > prev.updatedAt) byDevice.set(f.deviceId, f)
  }
  return [...byDevice.values()]
}

export interface LiveRemote {
  deviceId: string
  deviceName: string
  active: RemoteActive
}

/** 다른 기기에서 지금 도는 기록 (마지막 확인이 LIVE_WINDOW_MS 안인 것만) */
export function liveRemotes(files: DeviceFile[], ownDeviceId: string, now: number): LiveRemote[] {
  return latestPerDevice(files)
    .filter(
      (f) => f.deviceId !== ownDeviceId && f.active && now - f.active.heartbeatAt <= LIVE_WINDOW_MS
    )
    .map((f) => ({
      deviceId: f.deviceId,
      deviceName: f.deviceName || f.deviceId.slice(0, 8),
      active: f.active as RemoteActive
    }))
}

/** 시작 순서: 시각이 같으면 기기 ID 로 정해, 두 기기가 서로를 끄는 일이 없게 한다 */
function startedLater(
  a: { startedAt: number; deviceId: string },
  b: { startedAt: number; deviceId: string }
): boolean {
  return a.startedAt > b.startedAt || (a.startedAt === b.startedAt && a.deviceId > b.deviceId)
}

/**
 * 이어받기: 내 진행 중 기록보다 먼저 시작해 아직 도는 다른 기기 기록마다 "내가 시작한 시각에 끝내 줘".
 * 이미 보낸 요청은 다시 만들지 않는다.
 */
export function handoffRequests(
  own: { deviceId: string; active: { id: string; startedAt: number } | null },
  live: LiveRemote[],
  existing: StopRequest[],
  now: number
): StopRequest[] {
  const active = own.active
  if (!active) return []
  const mine = { startedAt: active.startedAt, deviceId: own.deviceId }
  return live
    .filter((r) => startedLater(mine, { startedAt: r.active.startedAt, deviceId: r.deviceId }))
    .filter((r) => !existing.some((q) => q.deviceId === r.deviceId && q.sessionId === r.active.id))
    .map((r) => ({
      deviceId: r.deviceId,
      sessionId: r.active.id,
      endAt: active.startedAt,
      requestedAt: now
    }))
}

/** 내 진행 중 기록을 끝내 달라는 요청이 있으면 가장 이른 끝 시각과 요청한 기기 */
export function incomingStop(
  files: DeviceFile[],
  ownDeviceId: string,
  ownActive: { id: string; startedAt: number } | null
): { endAt: number; fromDeviceId: string; fromDeviceName: string } | null {
  if (!ownActive) return null
  let found: { endAt: number; fromDeviceId: string; fromDeviceName: string } | null = null
  for (const f of files) {
    if (f.deviceId === ownDeviceId) continue
    for (const r of f.stopRequests ?? []) {
      if (r.deviceId !== ownDeviceId || r.sessionId !== ownActive.id) continue
      const endAt = Math.max(r.endAt, ownActive.startedAt)
      if (!found || endAt < found.endAt) {
        found = {
          endAt,
          fromDeviceId: f.deviceId,
          fromDeviceName: f.deviceName || f.deviceId.slice(0, 8)
        }
      }
    }
  }
  return found
}

/** 오래된 끝내기 요청 정리 */
export function pruneStopRequests(requests: StopRequest[], now: number): StopRequest[] {
  return requests.filter((r) => now - r.requestedAt <= STOP_REQUEST_TTL_MS)
}

/**
 * 다른 기기들의 기록을 하나로. 내 기기 파일은 로컬이 원본이라 건너뛴다.
 * 같은 기록 ID 가 여러 번 나오면(같은 파일이 두 번 올라간 경우 등) 한 번만 센다.
 */
export function mergeRemoteSessions(files: DeviceFile[], ownDeviceId: string): Session[] {
  const byId = new Map<string, Session>()
  // 같은 기기의 옛 사본(폴더 경쟁의 흔적)에도 기록이 있을 수 있어 전부 합친다 — ID 로 중복 제거
  for (const f of files) {
    if (f.deviceId === ownDeviceId) continue
    for (const s of f.sessions) byId.set(s.id, s)
  }
  return [...byId.values()].sort((a, b) => a.startedAt - b.startedAt)
}

/** 동기화 상태 (main → 렌더러). 오류는 코드로 보내고 문구는 렌더러가 언어에 맞춰 고른다. */
export type SyncErrorCode =
  | 'needs_login' // 리프레시 토큰 만료·철회 (테스트 상태 앱의 7일 만료 포함) → 다시 로그인
  | 'login_failed' // 코드 교환 실패 (클라이언트 ID·비밀키 오류 등)
  | 'login_cancelled' // 브라우저에서 거절했거나 시간 초과
  | 'no_encryption' // OS 보안 저장소를 못 써서 키를 안전하게 저장할 수 없음
  | 'network' // 인터넷 연결 문제
  | 'drive' // 드라이브 API 오류
  | 'folder_unavailable' // 고른 폴더에 접근할 수 없음 (드라이브가 빠졌거나 클라우드 앱이 꺼짐)
  | 'folder_not_writable' // 고른 폴더에 쓸 수 없음

export interface SyncStatus {
  /** off: 연결 안 함 · connecting: 브라우저 로그인 대기 · idle · syncing · error */
  state: 'off' | 'connecting' | 'idle' | 'syncing' | 'error'
  /** 로그인 정보가 있어 동기화할 수 있는 상태인지 (오류가 나도 연결은 유지될 수 있다) */
  connected: boolean
  lastSyncedAt: number | null
  /** 마지막 동기화에서 읽은 다른 기기 수 */
  deviceCount: number
  error: SyncErrorCode | null
  /** 저장된 클라이언트 ID (다시 로그인할 때 보여주기용, 비밀키는 보내지 않는다) */
  clientId: string | null
  /** 동기화 방식 (#25): 구글 계정(내 키) 또는 클라우드 동기화 폴더 */
  mode: 'google' | 'folder' | null
  /** 폴더 방식일 때 기록이 쓰이는 폴더 (고른 폴더 안의 앱 폴더) */
  folderPath: string | null
}

/** 이 컴퓨터에서 찾은 클라우드 동기화 폴더 (#25, 찾기는 main/sync/cloudFolders.ts) */
export type CloudProvider = 'google' | 'dropbox' | 'onedrive' | 'icloud'

export interface CloudFolder {
  provider: CloudProvider
  path: string
}
