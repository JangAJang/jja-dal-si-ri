import { createHash } from 'crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DRIVE_FOLDER_NAME,
  HEARTBEAT_UPLOAD_MS,
  deviceFileName,
  handoffRequests,
  incomingStop,
  liveRemotes,
  parseDeviceFile
} from '../../shared/sync'
import type { ActiveSession, Session } from '../../shared/timer'
import { DriveClient, DriveError } from './drive'
import {
  OAuthError,
  buildAuthUrl,
  createPkce,
  exchangeCode,
  listenForCode,
  DRIVE_FILE_SCOPE
} from './oauth'
import { GoogleSession } from './session'
import { SyncEngine, type OwnState } from './syncEngine'
import { startFakeGoogle, type FakeGoogle } from './testing/fakeGoogle'

const client = { clientId: 'cid.apps.googleusercontent.com', clientSecret: 'secret' }
const work = (id: string, startedAt: number): Session => ({
  id,
  category: 'work',
  startedAt,
  endedAt: startedAt + 1000
})

/** 엔진에 넘길 이 기기 상태 */
const own = (sessions: Session[], active: ActiveSession | null = null): OwnState => ({
  sessions,
  active,
  deviceName: 'TEST',
  stopRequests: []
})

let g: FakeGoogle
beforeEach(async () => {
  g = await startFakeGoogle()
})
afterEach(async () => {
  await g.close()
})

/** 가짜 구글에 로그인한 기기 하나 */
async function device(deviceId: string): Promise<{ engine: SyncEngine; session: GoogleSession }> {
  const { verifier } = createPkce()
  const tokens = await exchangeCode(g.oauth, client, 'good-code', verifier, 'http://127.0.0.1:1')
  const session = new GoogleSession(client, tokens.refreshToken!, g.oauth)
  const drive = new DriveClient(session.accessToken, g.drive, fetch, () => session.invalidate())
  return { engine: new SyncEngine(drive, deviceId), session }
}

describe('PKCE·인증 주소', () => {
  it('challenge = base64url(sha256(verifier)), verifier 는 43~128자', () => {
    const { verifier, challenge } = createPkce()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    const expected = createHash('sha256').update(verifier).digest('base64url')
    expect(challenge).toBe(expected)
  })

  it('인증 주소에 drive.file 만, S256, offline', () => {
    const url = new URL(buildAuthUrl(g.oauth, client, 'http://127.0.0.1:5', 'ch', 'st'))
    expect(url.searchParams.get('scope')).toBe(DRIVE_FILE_SCOPE)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('state')).toBe('st')
  })
})

describe('루프백으로 코드 받기', () => {
  it('state 가 맞으면 코드를 받는다', async () => {
    const l = await listenForCode('st-1', { ok: 'ok', fail: 'fail' })
    const page = await (await fetch(`${l.redirectUri}/?code=abc&state=st-1`)).text()
    expect(page).toBe('ok')
    await expect(l.code).resolves.toBe('abc')
  })

  it('state 가 다르면(다른 곳에서 온 요청) 거절한다', async () => {
    const l = await listenForCode('st-1', { ok: 'ok', fail: 'fail' })
    const rejected = expect(l.code).rejects.toThrow('state_mismatch')
    await fetch(`${l.redirectUri}/?code=abc&state=evil`)
    await rejected
  })

  it('취소하면 기다리던 쪽이 cancelled 로 끝난다', async () => {
    const l = await listenForCode('st-1', { ok: 'ok', fail: 'fail' })
    const rejected = expect(l.code).rejects.toThrow('cancelled')
    l.close()
    await rejected
  })

  it('사용자가 동의를 거절하면 그 오류로 끝난다', async () => {
    const l = await listenForCode('st-1', { ok: 'ok', fail: 'fail' })
    const rejected = expect(l.code).rejects.toThrow('access_denied')
    await fetch(`${l.redirectUri}/?error=access_denied&state=st-1`)
    await rejected
  })
})

describe('토큰', () => {
  it('잘못된 코드는 OAuthError(invalid_grant)', async () => {
    await expect(
      exchangeCode(g.oauth, client, 'bad', 'v', 'http://127.0.0.1:1')
    ).rejects.toMatchObject({ code: 'invalid_grant' })
    await expect(exchangeCode(g.oauth, client, 'bad', 'v', 'x')).rejects.toBeInstanceOf(OAuthError)
  })

  it('액세스 토큰이 만료되면 리프레시 토큰으로 새로 받는다', async () => {
    const { session } = await device('a')
    const first = await session.accessToken()
    expect(await session.accessToken()).toBe(first) // 아직 유효하면 재사용
    g.accessTokens.clear() // 서버에서 만료
    session.invalidate()
    const second = await session.accessToken()
    expect(second).not.toBe(first)
  })

  it('리프레시 토큰이 철회되면 invalid_grant (다시 로그인 필요)', async () => {
    const { session } = await device('a')
    g.refreshTokens.clear()
    await expect(session.accessToken()).rejects.toMatchObject({ code: 'invalid_grant' })
  })
})

describe('SyncEngine: 두 기기', () => {
  it('서로의 기록을 받고, 기기마다 파일은 하나씩만 생긴다', async () => {
    const pc = await device('pc')
    const mac = await device('mac')

    const r1 = await pc.engine.run(own([work('p1', 100)]), 1)
    expect(r1.remoteSessions).toEqual([])

    const r2 = await mac.engine.run(own([work('m1', 200)]), 2)
    expect(r2.remoteSessions.map((s) => s.id)).toEqual(['p1'])

    const r3 = await pc.engine.run(own([work('p1', 100), work('p2', 300)]), 3)
    expect(r3.remoteSessions.map((s) => s.id)).toEqual(['m1'])
    expect(r3.deviceCount).toBe(1)

    const r4 = await mac.engine.run(own([work('m1', 200)]), 4)
    expect(r4.remoteSessions.map((s) => s.id)).toEqual(['p1', 'p2'])

    const folders = [...g.files.values()].filter((f) => f.name === DRIVE_FOLDER_NAME)
    const pcFiles = [...g.files.values()].filter((f) => f.name === deviceFileName('pc'))
    expect(folders).toHaveLength(1)
    expect(pcFiles).toHaveLength(1)
    expect(parseDeviceFile(pcFiles[0].content)?.sessions).toHaveLength(2)
  })

  it('형식이 틀린 파일은 건너뛰고 나머지는 받는다', async () => {
    const pc = await device('pc')
    const mac = await device('mac')
    await mac.engine.run(own([work('m1', 1)]), 1)
    const folder = [...g.files.values()].find((f) => f.name === DRIVE_FOLDER_NAME)!
    g.files.set('junk', {
      id: 'junk',
      name: deviceFileName('broken'),
      mimeType: 'application/json',
      parents: [folder.id],
      content: '{not json',
      trashed: false
    })
    const r = await pc.engine.run(own([]), 2)
    expect(r.remoteSessions.map((s) => s.id)).toEqual(['m1'])
    expect(r.skippedFiles).toBe(1)
  })

  it('앱 폴더를 휴지통에 넣으면 새 폴더를 만들어 거기에 쓴다', async () => {
    const pc = await device('pc')
    await pc.engine.run(own([work('p1', 1)]), 1)
    for (const f of g.files.values()) f.trashed = true
    await pc.engine.run(own([work('p1', 1)]), 2)
    const live = [...g.files.values()].filter((f) => !f.trashed)
    expect(live.map((f) => f.name).sort()).toEqual([DRIVE_FOLDER_NAME, deviceFileName('pc')].sort())
  })

  it('서버에서 액세스 토큰이 먼저 만료돼도(401) 새 토큰으로 한 번 다시 시도해 성공한다', async () => {
    const pc = await device('pc')
    await pc.engine.run(own([work('p1', 1)]), 1)
    g.accessTokens.clear() // 클라이언트는 아직 유효하다고 알고 있음
    await expect(pc.engine.run(own([work('p1', 1)]), 2)).resolves.toMatchObject({ deviceCount: 0 })
  })

  it('드라이브 오류는 DriveError(상태코드)로 올라온다', async () => {
    const drive = new DriveClient(async () => 'not-a-token', g.drive)
    await expect(drive.findFolders('x')).rejects.toBeInstanceOf(DriveError)
    await expect(drive.findFolders('x')).rejects.toMatchObject({ status: 401 })
  })
})

describe('SyncEngine: 동시 실행·진행 중 기록', () => {
  it('빈 드라이브에서 3대가 동시에 처음 동기화해도, 다음 바퀴부터 한 폴더로 모여 서로 다 보인다', async () => {
    const [a, b, c] = await Promise.all([device('a'), device('b'), device('c')])
    await Promise.all([
      a.engine.run(own([work('A', 1)]), 1),
      b.engine.run(own([work('B', 2)]), 1),
      c.engine.run(own([work('C', 3)]), 1)
    ])
    const round2 = await Promise.all([
      a.engine.run(own([work('A', 1)]), 2),
      b.engine.run(own([work('B', 2)]), 2),
      c.engine.run(own([work('C', 3)]), 2)
    ])
    expect(
      round2.map((r) =>
        r.remoteSessions
          .map((x) => x.id)
          .sort()
          .join('+')
      )
    ).toEqual(['B+C', 'A+C', 'A+B'])
    // 각 기기의 살아 있는 파일은 가장 먼저 만든 폴더에 하나씩만 남는다
    const home = [...g.files.values()]
      .filter((f) => f.name === DRIVE_FOLDER_NAME)
      .sort((x, y) => (x.created ?? 0) - (y.created ?? 0))[0]
    const liveFiles = [...g.files.values()].filter(
      (f) => !f.trashed && f.name.startsWith('sessions-')
    )
    expect(liveFiles).toHaveLength(3)
    expect(liveFiles.every((f) => f.parents.includes(home.id))).toBe(true)
  })

  it('바뀐 게 없으면 다시 올리지 않고, 진행 중이면 4분마다 "살아 있음"을 다시 올린다', async () => {
    const pc = await device('pc')
    const active: ActiveSession = { id: 'run', category: 'study', startedAt: 0, lastHeartbeatAt: 0 }
    expect((await pc.engine.run(own([work('p', 1)]), 1_000)).uploaded).toBe(true)
    expect((await pc.engine.run(own([work('p', 1)]), 2_000)).uploaded).toBe(false)
    expect((await pc.engine.run(own([work('p', 1)], active), 3_000)).uploaded).toBe(true)
    expect((await pc.engine.run(own([work('p', 1)], active), 4_000)).uploaded).toBe(false)
    expect(
      (await pc.engine.run(own([work('p', 1)], active), 3_000 + HEARTBEAT_UPLOAD_MS)).uploaded
    ).toBe(true)
  })

  it('이어받기 한 바퀴: 맥에서 공부 중 → PC 에서 시작 → 맥이 PC 시작 시각에 끝내라는 요청을 받는다', async () => {
    const mac = await device('mac')
    const pc = await device('pc')
    const T = Date.now()
    const macActive: ActiveSession = {
      id: 'mac-study',
      category: 'study',
      startedAt: T - 60_000,
      lastHeartbeatAt: T
    }
    const pcActive: ActiveSession = {
      id: 'pc-work',
      category: 'work',
      startedAt: T,
      lastHeartbeatAt: T
    }

    await mac.engine.run(own([], macActive), T)
    // PC: 시작 직후 동기화 → 맥이 살아 있는 걸 보고 요청을 만든다
    const r = await pc.engine.run(own([], pcActive), T + 1_000)
    const live = liveRemotes(r.remoteFiles, 'pc', T + 1_000)
    expect(live.map((l) => [l.deviceName, l.active.id])).toEqual([['TEST', 'mac-study']])
    const requests = handoffRequests({ deviceId: 'pc', active: pcActive }, live, [], T + 1_000)
    await pc.engine.run({ ...own([], pcActive), stopRequests: requests }, T + 2_000)
    // 맥: 다음 동기화에서 요청을 받는다
    const m = await mac.engine.run(own([], macActive), T + 3_000)
    expect(incomingStop(m.remoteFiles, 'mac', macActive)).toMatchObject({
      endAt: T,
      fromDeviceId: 'pc'
    })
  })
})
