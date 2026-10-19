// 동기화 한 바퀴: 내 기기 파일 올리기 → 다른 기기 파일 내려받기 → 합치기.
// Electron·저장소·타이머에 의존하지 않아 가짜 드라이브 서버로 끝까지 테스트한다 (sync.test.ts).
//
// - 폴더·파일 ID 를 기억해 두지 않고 매번 찾는다. 사용자가 드라이브에서 앱 폴더를 휴지통에 넣으면
//   기억해 둔 ID 로는 오류도 안 나고 휴지통 안에 계속 쓰게 되기 때문이다 (검색은 trashed = false).
// - 같은 이름의 앱 폴더가 여러 개면(여러 기기가 처음에 동시에 만든 경우) 가장 먼저 만든 폴더에 쓰고,
//   읽기는 모든 폴더에서 한다. 다음 동기화부터 모든 기기가 같은 폴더로 모이고, 다른 폴더에 남은
//   내 옛 사본은 휴지통으로 보낸다.
import {
  DRIVE_FOLDER_NAME,
  HEARTBEAT_UPLOAD_MS,
  deviceFileName,
  deviceIdFromFileName,
  mergeRemoteSessions,
  parseDeviceFile,
  type DeviceFile,
  type RemoteActive,
  type StopRequest
} from '../../shared/sync'
import type { ActiveSession, Session } from '../../shared/timer'
import type { DriveClient, DriveFile } from './drive'

/** 이 기기가 올릴 내용 */
export interface OwnState {
  sessions: Session[]
  active: ActiveSession | null
  deviceName: string
  stopRequests: StopRequest[]
}

export interface SyncResult {
  /** 다른 기기들의 끝난 기록 (내 기록 제외) */
  remoteSessions: Session[]
  /** 다른 기기 파일들 (진행 중 기록·끝내기 요청 판단용) */
  remoteFiles: DeviceFile[]
  /** 읽은 다른 기기 수 */
  deviceCount: number
  /** 형식이 틀려 건너뛴 파일 수 */
  skippedFiles: number
  /** 이번에 내 파일을 올렸는지 (내용이 같으면 건너뛴다) */
  uploaded: boolean
}

export class SyncEngine {
  /** 마지막으로 올린 내용(시각 제외)과 시각 — 바뀐 게 없으면 다시 올리지 않으려고 */
  private lastUploaded: { body: string; at: number } | null = null

  constructor(
    private readonly drive: DriveClient,
    private readonly deviceId: string
  ) {}

  async run(own: OwnState, now: number): Promise<SyncResult> {
    let folders = await this.drive.findFolders(DRIVE_FOLDER_NAME)
    if (folders.length === 0) {
      folders = [{ id: await this.drive.createFolder(DRIVE_FOLDER_NAME), name: DRIVE_FOLDER_NAME }]
    }
    const home = folders[0]
    const childrenByFolder = await Promise.all(
      folders.map(async (f) => ({ folder: f, children: await this.drive.listChildren(f.id) }))
    )

    const uploaded = await this.uploadOwn(own, now, home, childrenByFolder)

    const files: DeviceFile[] = []
    let skipped = 0
    for (const { children } of childrenByFolder) {
      for (const f of children) {
        const id = deviceIdFromFileName(f.name)
        if (id === null || id === this.deviceId) continue
        const parsed = parseDeviceFile(await this.drive.download(f.id))
        if (parsed) files.push(parsed)
        else skipped++
      }
    }
    return {
      remoteSessions: mergeRemoteSessions(files, this.deviceId),
      remoteFiles: files,
      deviceCount: new Set(files.map((f) => f.deviceId)).size,
      skippedFiles: skipped,
      uploaded
    }
  }

  private async uploadOwn(
    own: OwnState,
    now: number,
    home: DriveFile,
    childrenByFolder: Array<{ folder: DriveFile; children: DriveFile[] }>
  ): Promise<boolean> {
    const ownName = deviceFileName(this.deviceId)
    const homeCopy = childrenByFolder[0].children.find((f) => f.name === ownName)
    const strayCopies = childrenByFolder
      .slice(1)
      .flatMap(({ children }) => children.filter((f) => f.name === ownName))

    // 시각을 뺀 내용이 같고, 진행 중이 아니거나 아직 "살아 있음"을 다시 알릴 때가 아니면 건너뛴다
    const body = JSON.stringify({
      sessions: own.sessions,
      active: own.active && {
        id: own.active.id,
        category: own.active.category,
        startedAt: own.active.startedAt
      },
      deviceName: own.deviceName,
      stopRequests: own.stopRequests
    })
    const unchanged =
      homeCopy &&
      strayCopies.length === 0 &&
      this.lastUploaded?.body === body &&
      (!own.active || now - this.lastUploaded.at < HEARTBEAT_UPLOAD_MS)
    if (unchanged) return false

    const active: RemoteActive | null = own.active && {
      id: own.active.id,
      category: own.active.category,
      startedAt: own.active.startedAt,
      heartbeatAt: now
    }
    const file: DeviceFile = {
      version: 1,
      deviceId: this.deviceId,
      updatedAt: now,
      sessions: own.sessions,
      deviceName: own.deviceName,
      active,
      stopRequests: own.stopRequests
    }
    const content = JSON.stringify(file)
    if (homeCopy) await this.drive.updateJson(homeCopy.id, content)
    else await this.drive.createJson(home.id, ownName, content)
    for (const stray of strayCopies) await this.drive.trash(stray.id)
    this.lastUploaded = { body, at: now }
    return true
  }
}
