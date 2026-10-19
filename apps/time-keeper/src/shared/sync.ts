// 구글 드라이브 동기화(#7)의 파일 형식과 병합 규칙. 순수 함수만.
//
// 각 기기는 드라이브의 앱 폴더에 자기 파일(sessions-<deviceId>.json) 하나만 쓴다.
// 다른 기기 파일은 읽기만 한다. 그래서 여러 기기가 동시에 써도 서로 덮어쓰지 않는다.
import type { Session } from './timer'

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
  /** 이 기기에서 끝난 기록들 (진행 중인 기록은 끝난 뒤에 올라간다) */
  sessions: Session[]
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
    sessions: o.sessions.filter(isSession)
  }
}

/**
 * 다른 기기들의 기록을 하나로. 내 기기 파일은 로컬이 원본이라 건너뛴다.
 * 같은 기록 ID 가 여러 번 나오면(같은 파일이 두 번 올라간 경우 등) 한 번만 센다.
 */
export function mergeRemoteSessions(files: DeviceFile[], ownDeviceId: string): Session[] {
  const byId = new Map<string, Session>()
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
}
