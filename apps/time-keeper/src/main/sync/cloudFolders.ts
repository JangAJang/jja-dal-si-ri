// 이 컴퓨터에 있는 클라우드 동기화 폴더 찾기 (#25) — 설정에서 "원클릭 후보"로 보여준다.
// 파일 시스템 접근은 주입받아 운영체제별 경로 규칙을 테스트한다 (cloudFolders.test.ts).
import { posix } from 'path'

import type { CloudFolder, CloudProvider } from '../../shared/sync'

export type { CloudFolder, CloudProvider }

export interface DetectEnv {
  platform: NodeJS.Platform
  home: string
  env: Record<string, string | undefined>
  isDir: (path: string) => boolean
  /** 폴더 안 이름들 (없으면 []) */
  list: (path: string) => string[]
}

/** 구글 드라이브 데스크톱의 "내 드라이브" 폴더 이름 (표시 언어에 따라 다르다) */
const MY_DRIVE = ['My Drive', '내 드라이브']

export function detectCloudFolders(e: DetectEnv): CloudFolder[] {
  const found: CloudFolder[] = []
  const add = (provider: CloudProvider, path: string): void => {
    if (e.isDir(path) && !found.some((f) => f.path === path)) found.push({ provider, path })
  }
  // 경로 조합은 대상 운영체제 규칙으로 (테스트에서 다른 OS 경로를 다뤄도 맞게)
  const j = (...parts: string[]): string =>
    e.platform === 'win32' ? parts.join('\\').replace(/\\+/g, '\\') : posix.join(...parts)

  if (e.platform === 'win32') {
    // 구글 드라이브 데스크톱: 가상 드라이브(G: 등)의 "내 드라이브", 또는 미러링 모드의 사용자 폴더
    for (const letter of 'DEFGHIJKLMNOPQRSTUVWXYZ') {
      for (const name of MY_DRIVE) add('google', `${letter}:\\${name}`)
    }
    for (const name of [...MY_DRIVE, 'Google Drive']) add('google', j(e.home, name))
    add('dropbox', j(e.home, 'Dropbox'))
    if (e.env['OneDrive']) add('onedrive', e.env['OneDrive'])
    add('onedrive', j(e.home, 'OneDrive'))
    add('icloud', j(e.home, 'iCloudDrive'))
  } else if (e.platform === 'darwin') {
    const cloudStorage = j(e.home, 'Library', 'CloudStorage')
    for (const entry of e.list(cloudStorage)) {
      if (entry.startsWith('GoogleDrive-')) {
        for (const name of MY_DRIVE) add('google', j(cloudStorage, entry, name))
      } else if (entry === 'Dropbox' || entry.startsWith('Dropbox-')) {
        add('dropbox', j(cloudStorage, entry))
      } else if (entry.startsWith('OneDrive-')) {
        add('onedrive', j(cloudStorage, entry))
      }
    }
    add('dropbox', j(e.home, 'Dropbox'))
    add('icloud', j(e.home, 'Library', 'Mobile Documents', 'com~apple~CloudDocs'))
  }
  return found
}
