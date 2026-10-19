import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DRIVE_FOLDER_NAME, deviceFileName } from '../../shared/sync'
import type { Session } from '../../shared/timer'
import { FolderStore, FolderUnavailableError } from './store'
import { SyncEngine, type OwnState } from './syncEngine'

// 폴더 동기화(#25): 두 컴퓨터가 같은 클라우드 폴더를 쓴다고 보고, 한 임시 폴더를 함께 쓴다.
let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tk-folder-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const work = (id: string): Session => ({ id, category: 'work', startedAt: 1, endedAt: 2 })
const own = (sessions: Session[]): OwnState => ({
  sessions,
  active: null,
  deviceName: 'TEST',
  stopRequests: []
})

describe('FolderStore + SyncEngine', () => {
  it('같은 폴더를 쓰는 두 컴퓨터가 서로의 기록을 받는다', async () => {
    const pc = new SyncEngine(new FolderStore(root), 'pc')
    const mac = new SyncEngine(new FolderStore(root), 'mac')
    await pc.run(own([work('p1')]), 1)
    const r = await mac.run(own([work('m1')]), 2)
    expect(r.remoteSessions.map((s) => s.id)).toEqual(['p1'])
    const back = await pc.run(own([work('p1')]), 3)
    expect(back.remoteSessions.map((s) => s.id)).toEqual(['m1'])
    // 고른 폴더 안에 앱 폴더 하나, 그 안에 기기 파일 둘
    expect(readdirSync(join(root, DRIVE_FOLDER_NAME)).sort()).toEqual(
      [deviceFileName('mac'), deviceFileName('pc')].sort()
    )
  })

  it('클라우드 앱의 충돌 사본은 다른 기기로 세지 않는다', async () => {
    const pc = new SyncEngine(new FolderStore(root), 'pc')
    await pc.run(own([work('p1')]), 1)
    const dir = join(root, DRIVE_FOLDER_NAME)
    // Dropbox/구글 드라이브가 만드는 충돌 사본 흉내 — 내용은 pc 자기 파일
    writeFileSync(
      join(dir, 'sessions-pc (1).json'),
      JSON.stringify({ version: 1, deviceId: 'pc', updatedAt: 0, sessions: [work('old')] })
    )
    const r = await pc.run(own([work('p1')]), 2)
    expect(r.deviceCount).toBe(0)
    expect(r.remoteSessions).toEqual([])
  })

  it('쓰다 만 임시 파일은 기기 파일로 읽지 않는다', async () => {
    const pc = new SyncEngine(new FolderStore(root), 'pc')
    await pc.run(own([]), 1)
    writeFileSync(join(root, DRIVE_FOLDER_NAME, 'sessions-mac.json.tmp-ab12'), '{half')
    const r = await pc.run(own([]), 2)
    expect(r.skippedFiles).toBe(0)
  })

  it('고른 폴더가 사라지면(드라이브 빠짐 등) FolderUnavailableError', async () => {
    const gone = join(root, 'not-here')
    const pc = new SyncEngine(new FolderStore(gone), 'pc')
    await expect(pc.run(own([]), 1)).rejects.toBeInstanceOf(FolderUnavailableError)
  })
})
