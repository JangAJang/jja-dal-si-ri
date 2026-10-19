import { describe, expect, it } from 'vitest'
import { detectCloudFolders, type DetectEnv } from './cloudFolders'

/** 있는 폴더 목록으로 가짜 파일 시스템 */
const fakeFs = (
  platform: NodeJS.Platform,
  home: string,
  dirs: string[],
  env: DetectEnv['env'] = {}
): DetectEnv => ({
  platform,
  home,
  env,
  isDir: (p) => dirs.includes(p),
  list: (p) =>
    dirs
      .filter((d) => d.startsWith(p + '/') && !d.slice(p.length + 1).includes('/'))
      .map((d) => d.slice(p.length + 1))
})

describe('detectCloudFolders', () => {
  it('Windows: 구글 드라이브 가상 드라이브(한국어 "내 드라이브"), Dropbox, OneDrive(환경변수)', () => {
    const found = detectCloudFolders(
      fakeFs('win32', 'C:\\Users\\me', ['G:\\내 드라이브', 'C:\\Users\\me\\Dropbox', 'D:\\OD'], {
        OneDrive: 'D:\\OD'
      })
    )
    expect(found).toEqual([
      { provider: 'google', path: 'G:\\내 드라이브' },
      { provider: 'dropbox', path: 'C:\\Users\\me\\Dropbox' },
      { provider: 'onedrive', path: 'D:\\OD' }
    ])
  })

  it('Windows: 없는 건 보여주지 않는다', () => {
    expect(detectCloudFolders(fakeFs('win32', 'C:\\Users\\me', []))).toEqual([])
  })

  it('macOS: CloudStorage 아래 구글 드라이브·Dropbox·OneDrive, iCloud', () => {
    const h = '/Users/me'
    const cs = `${h}/Library/CloudStorage`
    const found = detectCloudFolders(
      fakeFs('darwin', h, [
        cs,
        `${cs}/GoogleDrive-me@gmail.com`,
        `${cs}/GoogleDrive-me@gmail.com/My Drive`,
        `${cs}/Dropbox`,
        `${cs}/OneDrive-Personal`,
        `${h}/Library/Mobile Documents/com~apple~CloudDocs`
      ])
    )
    expect(found.map((f) => f.provider)).toEqual(['google', 'dropbox', 'onedrive', 'icloud'])
    expect(found[0].path).toBe(`${cs}/GoogleDrive-me@gmail.com/My Drive`)
  })
})
