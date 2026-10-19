// 새 버전 알림 (#9). 순수 함수만.
// 이 레포에는 앱이 여러 개라 GitHub Releases 에도 여러 앱의 릴리스가 섞인다.
// 태그 time-keeper/v<버전> 인 것만 보고, 지금 버전보다 높은 정식 릴리스가 있으면 알린다.

export const RELEASE_TAG_PREFIX = 'time-keeper/v'

/** GitHub REST API 의 릴리스 중 쓰는 필드 */
export interface GitHubRelease {
  tag_name: string
  html_url: string
  draft: boolean
  prerelease: boolean
}

export interface UpdateInfo {
  version: string
  url: string
}

type Semver = [number, number, number]

/** "1.2.3" → [1,2,3]. 정식 x.y.z 가 아니면 null (예: 1.2, 1.2.3-beta) */
export function parseSemver(v: string): Semver | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

export function compareSemver(a: Semver, b: Semver): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

/** 지금 버전보다 높은, 이 앱의 정식 릴리스 중 가장 높은 것. 없으면 null. */
export function findUpdate(releases: GitHubRelease[], currentVersion: string): UpdateInfo | null {
  const current = parseSemver(currentVersion)
  if (!current) return null
  let best: { v: Semver; info: UpdateInfo } | null = null
  for (const r of releases) {
    if (r.draft || r.prerelease || !r.tag_name.startsWith(RELEASE_TAG_PREFIX)) continue
    const version = r.tag_name.slice(RELEASE_TAG_PREFIX.length)
    const v = parseSemver(version)
    if (!v || compareSemver(v, current) <= 0) continue
    if (!best || compareSemver(v, best.v) > 0) best = { v, info: { version, url: r.html_url } }
  }
  return best?.info ?? null
}
