// 동기화 한 바퀴: 내 기록 올리기 → 다른 기기 기록 내려받기 → 합치기.
// Electron·저장소·타이머에 의존하지 않아 가짜 드라이브 서버로 끝까지 테스트한다 (syncEngine.test.ts).
//
// 폴더·파일 ID 를 기억해 두지 않고 매번 찾는다. 사용자가 드라이브에서 앱 폴더를 휴지통에 넣으면
// 기억해 둔 ID 로는 오류도 안 나고 휴지통 안에 계속 쓰게 되기 때문이다 (검색은 trashed = false).
import {
  DRIVE_FOLDER_NAME,
  deviceFileName,
  deviceIdFromFileName,
  mergeRemoteSessions,
  parseDeviceFile,
  type DeviceFile
} from '../../shared/sync'
import type { Session } from '../../shared/timer'
import type { DriveClient } from './drive'

export interface SyncResult {
  /** 다른 기기들의 기록 (내 기록 제외) */
  remoteSessions: Session[]
  /** 읽은 다른 기기 수 */
  deviceCount: number
  /** 형식이 틀려 건너뛴 파일 수 */
  skippedFiles: number
}

export class SyncEngine {
  constructor(
    private readonly drive: DriveClient,
    private readonly deviceId: string
  ) {}

  async run(ownSessions: Session[], now: number): Promise<SyncResult> {
    const folderId = await this.drive.ensureFolder(DRIVE_FOLDER_NAME)
    const children = await this.drive.listChildren(folderId)
    const ownName = deviceFileName(this.deviceId)

    const own: DeviceFile = {
      version: 1,
      deviceId: this.deviceId,
      updatedAt: now,
      sessions: ownSessions
    }
    const content = JSON.stringify(own)
    const existing = children.find((f) => f.name === ownName)
    if (existing) await this.drive.updateJson(existing.id, content)
    else await this.drive.createJson(folderId, ownName, content)

    const files: DeviceFile[] = []
    let skipped = 0
    for (const f of children) {
      const id = deviceIdFromFileName(f.name)
      if (id === null || id === this.deviceId) continue
      const parsed = parseDeviceFile(await this.drive.download(f.id))
      if (parsed) files.push(parsed)
      else skipped++
    }
    return {
      remoteSessions: mergeRemoteSessions(files, this.deviceId),
      deviceCount: files.length,
      skippedFiles: skipped
    }
  }
}
