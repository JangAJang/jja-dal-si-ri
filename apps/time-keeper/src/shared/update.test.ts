import { describe, expect, it } from 'vitest'
import { findUpdate, type GitHubRelease } from './update'

const rel = (tag: string, extra: Partial<GitHubRelease> = {}): GitHubRelease => ({
  tag_name: tag,
  html_url: `https://github.com/x/y/releases/tag/${encodeURIComponent(tag)}`,
  draft: false,
  prerelease: false,
  ...extra
})

describe('findUpdate', () => {
  it('이 앱 태그 중 지금보다 높은 가장 높은 버전 (숫자 비교: 0.10.0 > 0.9.0)', () => {
    const r = findUpdate(
      [rel('time-keeper/v0.2.0'), rel('time-keeper/v0.10.0'), rel('time-keeper/v0.9.0')],
      '0.1.0'
    )
    expect(r?.version).toBe('0.10.0')
    expect(r?.url).toContain('time-keeper%2Fv0.10.0')
  })

  it('다른 앱의 릴리스는 무시', () => {
    expect(findUpdate([rel('snack-request/v9.0.0')], '0.1.0')).toBeNull()
  })

  it('같거나 낮은 버전, 초안·미리보기·이상한 버전은 무시', () => {
    expect(
      findUpdate(
        [
          rel('time-keeper/v0.1.0'),
          rel('time-keeper/v0.0.9'),
          rel('time-keeper/v1.0.0', { draft: true }),
          rel('time-keeper/v1.0.0', { prerelease: true }),
          rel('time-keeper/v2.0.0-beta'),
          rel('time-keeper/vnext')
        ],
        '0.1.0'
      )
    ).toBeNull()
  })

  it('지금 버전이 이상하면 알리지 않는다', () => {
    expect(findUpdate([rel('time-keeper/v1.0.0')], 'dev')).toBeNull()
  })
})
