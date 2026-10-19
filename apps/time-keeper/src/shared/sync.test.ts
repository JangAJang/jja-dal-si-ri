import { describe, expect, it } from 'vitest'
import {
  LIVE_WINDOW_MS,
  STOP_REQUEST_TTL_MS,
  handoffRequests,
  incomingStop,
  liveRemotes,
  pruneStopRequests,
  deviceFileName,
  deviceIdFromFileName,
  mergeRemoteSessions,
  parseDeviceFile,
  type DeviceFile,
  type StopRequest
} from './sync'

const s = (id: string, startedAt: number): DeviceFile['sessions'][number] => ({
  id,
  category: 'work',
  startedAt,
  endedAt: startedAt + 10
})

describe('기기별 파일 이름', () => {
  it('왕복', () => {
    expect(deviceIdFromFileName(deviceFileName('abc-123'))).toBe('abc-123')
  })

  it('이 앱 파일이 아니면 null', () => {
    expect(deviceIdFromFileName('notes.txt')).toBeNull()
    expect(deviceIdFromFileName('sessions-.json')).toBeNull()
  })
})

describe('parseDeviceFile', () => {
  it('형식이 틀린 기록은 버린다', () => {
    const text = JSON.stringify({
      version: 1,
      deviceId: 'b',
      updatedAt: 5,
      sessions: [s('ok', 1), { id: 'bad', category: 'nap', startedAt: 1, endedAt: 2 }, null]
    })
    expect(parseDeviceFile(text)?.sessions.map((x) => x.id)).toEqual(['ok'])
  })

  it('파일 자체가 틀리면 null', () => {
    expect(parseDeviceFile('not json')).toBeNull()
    expect(parseDeviceFile(JSON.stringify({ version: 2, deviceId: 'b', sessions: [] }))).toBeNull()
  })
})

describe('mergeRemoteSessions', () => {
  it('내 기기 파일은 건너뛰고, 다른 기기 기록을 시간순으로 합친다', () => {
    const files: DeviceFile[] = [
      { version: 1, deviceId: 'me', updatedAt: 0, sessions: [s('m1', 1)] },
      { version: 1, deviceId: 'pc', updatedAt: 0, sessions: [s('p2', 30), s('p1', 10)] },
      { version: 1, deviceId: 'mac', updatedAt: 0, sessions: [s('c1', 20)] }
    ]
    expect(mergeRemoteSessions(files, 'me').map((x) => x.id)).toEqual(['p1', 'c1', 'p2'])
  })

  it('같은 기록 ID 는 한 번만', () => {
    const files: DeviceFile[] = [
      { version: 1, deviceId: 'pc', updatedAt: 0, sessions: [s('x', 1)] },
      { version: 1, deviceId: 'pc-copy', updatedAt: 0, sessions: [s('x', 1)] }
    ]
    expect(mergeRemoteSessions(files, 'me')).toHaveLength(1)
  })
})

describe('이어받기 규칙', () => {
  const NOW = 10_000_000
  const file = (
    deviceId: string,
    active: { id: string; startedAt: number; heartbeatAt: number } | null,
    extra: Partial<DeviceFile> = {}
  ): DeviceFile => ({
    version: 1,
    deviceId,
    updatedAt: NOW,
    sessions: [],
    deviceName: deviceId.toUpperCase(),
    active: active && { ...active, category: 'study' },
    stopRequests: [],
    ...extra
  })

  it('최근에 확인된 진행 중 기록만 살아 있다고 본다 (꺼진 기기의 유령 무시)', () => {
    const files = [
      file('mac', { id: 'm', startedAt: 1, heartbeatAt: NOW - 60_000 }),
      file('old', { id: 'o', startedAt: 1, heartbeatAt: NOW - LIVE_WINDOW_MS - 1 }),
      file('me', { id: 'x', startedAt: 1, heartbeatAt: NOW })
    ]
    expect(liveRemotes(files, 'me', NOW).map((r) => r.deviceName)).toEqual(['MAC'])
  })

  it('나중에 시작한 쪽만 먼저 시작한 쪽에 끝내기 요청을 보낸다', () => {
    const live = liveRemotes(
      [file('mac', { id: 'm', startedAt: 100, heartbeatAt: NOW })],
      'pc',
      NOW
    )
    // pc 가 나중에 시작 → 요청
    expect(
      handoffRequests({ deviceId: 'pc', active: { id: 'p', startedAt: 200 } }, live, [], NOW)
    ).toEqual([{ deviceId: 'mac', sessionId: 'm', endAt: 200, requestedAt: NOW }])
    // pc 가 먼저 시작 → 요청 없음 (저쪽이 이쪽을 끌 차례)
    expect(
      handoffRequests({ deviceId: 'pc', active: { id: 'p', startedAt: 50 } }, live, [], NOW)
    ).toEqual([])
  })

  it('같은 시각에 시작하면 기기 ID 로 한쪽만 끈다 (서로 끄지 않는다)', () => {
    const a = handoffRequests(
      { deviceId: 'a', active: { id: 'A', startedAt: 100 } },
      liveRemotes([file('b', { id: 'B', startedAt: 100, heartbeatAt: NOW })], 'a', NOW),
      [],
      NOW
    )
    const b = handoffRequests(
      { deviceId: 'b', active: { id: 'B', startedAt: 100 } },
      liveRemotes([file('a', { id: 'A', startedAt: 100, heartbeatAt: NOW })], 'b', NOW),
      [],
      NOW
    )
    expect(a.length + b.length).toBe(1)
  })

  it('이미 보낸 요청은 다시 만들지 않는다', () => {
    const live = liveRemotes(
      [file('mac', { id: 'm', startedAt: 100, heartbeatAt: NOW })],
      'pc',
      NOW
    )
    const sent = [{ deviceId: 'mac', sessionId: 'm', endAt: 200, requestedAt: 1 }]
    expect(
      handoffRequests({ deviceId: 'pc', active: { id: 'p', startedAt: 200 } }, live, sent, NOW)
    ).toEqual([])
  })

  it('나를 가리키는 요청만, 그 기록일 때만 받는다', () => {
    const req = (deviceId: string, sessionId: string, endAt: number): StopRequest => ({
      deviceId,
      sessionId,
      endAt,
      requestedAt: 0
    })
    const files = [
      file('pc', null, { stopRequests: [req('mac', 'm', 500), req('other', 'm', 100)] }),
      file('ipad', null, { stopRequests: [req('mac', 'm', 400)] })
    ]
    expect(incomingStop(files, 'mac', { id: 'm', startedAt: 10 })).toEqual({
      endAt: 400,
      fromDeviceId: 'ipad',
      fromDeviceName: 'IPAD'
    })
    // 그사이 새 기록을 시작했으면 옛 요청은 무시
    expect(incomingStop(files, 'mac', { id: 'new', startedAt: 10 })).toBeNull()
  })

  it('끝 시각이 내 시작보다 앞서면 시작 시각으로 (음수 길이 방지)', () => {
    const files = [
      file('pc', null, {
        stopRequests: [{ deviceId: 'mac', sessionId: 'm', endAt: 5, requestedAt: 0 }]
      })
    ]
    expect(incomingStop(files, 'mac', { id: 'm', startedAt: 10 })?.endAt).toBe(10)
  })

  it('하루 지난 요청은 정리', () => {
    const r = {
      deviceId: 'x',
      sessionId: 'y',
      endAt: 0,
      requestedAt: NOW - STOP_REQUEST_TTL_MS - 1
    }
    expect(pruneStopRequests([r], NOW)).toEqual([])
  })

  it('예전 형식 파일(진행 중·요청 없음)도 읽는다', () => {
    const parsed = parseDeviceFile(
      JSON.stringify({ version: 1, deviceId: 'old', updatedAt: 1, sessions: [] })
    )
    expect(parsed).toMatchObject({ active: null, stopRequests: [] })
  })
})
