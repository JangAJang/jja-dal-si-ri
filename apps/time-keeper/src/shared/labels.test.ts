import { describe, expect, it } from 'vitest'
import { statusText } from './labels'

describe('statusText', () => {
  it('진행 중이 아니면 대기 중', () => {
    expect(statusText(null, 0)).toBe('대기 중')
  })

  it('진행 중이면 분야와 경과 시간', () => {
    const active = { id: 'a', category: 'study' as const, startedAt: 0, lastHeartbeatAt: 0 }
    expect(statusText(active, 5_025_000)).toBe('공부 중 01:23:45')
  })
})
