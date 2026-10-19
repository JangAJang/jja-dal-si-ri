import { describe, expect, it } from 'vitest'
import {
  deviceFileName,
  deviceIdFromFileName,
  mergeRemoteSessions,
  parseDeviceFile,
  type DeviceFile
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
