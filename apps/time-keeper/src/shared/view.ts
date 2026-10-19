/** 창 종류. 렌더러는 URL 해시(#main / #digital / #analog)로 어떤 화면을 그릴지 정한다. */
export const VIEW_MODES = ['main', 'digital', 'analog'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export function parseViewMode(hash: string): ViewMode {
  const mode = hash.replace(/^#/, '')
  return (VIEW_MODES as readonly string[]).includes(mode) ? (mode as ViewMode) : 'main'
}
