// 동기화 저장소 (#25). SyncEngine 은 이 인터페이스에만 기대고, 실제 저장소는 둘이다:
//   - DriveClient  (drive.ts)  : 구글 드라이브 API — 내 키로 로그인
//   - FolderStore  (이 파일)   : 내 컴퓨터의 폴더 — 구글 드라이브 데스크톱·Dropbox 등이 그 폴더를 다른 컴퓨터로 옮겨 준다
import { randomBytes } from 'crypto'
import { existsSync, statSync } from 'fs'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'fs/promises'
import { join } from 'path'

export interface StoreEntry {
  id: string
  name: string
}

export interface SyncStore {
  /** 이름이 같은 앱 폴더들, 먼저 만든 순서 */
  findFolders(name: string): Promise<StoreEntry[]>
  createFolder(name: string): Promise<string>
  listChildren(folderId: string): Promise<StoreEntry[]>
  download(fileId: string): Promise<string>
  createJson(folderId: string, name: string, content: string): Promise<string>
  updateJson(fileId: string, content: string): Promise<void>
  trash(fileId: string): Promise<void>
}

/** 고른 폴더에 접근할 수 없음 (외장 드라이브 빠짐, 클라우드 앱이 꺼져 드라이브 문자가 사라짐 등) */
export class FolderUnavailableError extends Error {
  constructor(readonly path: string) {
    super(`folder unavailable: ${path}`)
  }
}

/**
 * 로컬 폴더 저장소. ID 는 절대 경로.
 * 쓰기는 임시 파일(.tmp-xxxx)에 쓴 뒤 이름을 바꾼다 — 클라우드 앱이 쓰다 만 파일을 올리지 않게.
 * 임시 파일 이름은 .json 으로 끝나지 않아 기기 파일로 읽히지 않는다.
 */
export class FolderStore implements SyncStore {
  constructor(readonly root: string) {}

  private ensureRoot(): void {
    if (!existsSync(this.root) || !statSync(this.root).isDirectory()) {
      throw new FolderUnavailableError(this.root)
    }
  }

  async findFolders(name: string): Promise<StoreEntry[]> {
    this.ensureRoot()
    const path = join(this.root, name)
    return existsSync(path) && statSync(path).isDirectory() ? [{ id: path, name }] : []
  }

  async createFolder(name: string): Promise<string> {
    this.ensureRoot()
    const path = join(this.root, name)
    await mkdir(path, { recursive: true })
    return path
  }

  async listChildren(folderId: string): Promise<StoreEntry[]> {
    const entries = await readdir(folderId, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile())
      .map((e) => ({ id: join(folderId, e.name), name: e.name }))
  }

  download(fileId: string): Promise<string> {
    return readFile(fileId, 'utf-8')
  }

  async createJson(folderId: string, name: string, content: string): Promise<string> {
    const path = join(folderId, name)
    await this.writeAtomic(path, content)
    return path
  }

  updateJson(fileId: string, content: string): Promise<void> {
    return this.writeAtomic(fileId, content)
  }

  async trash(fileId: string): Promise<void> {
    await rm(fileId, { force: true })
  }

  private async writeAtomic(path: string, content: string): Promise<void> {
    const tmp = `${path}.tmp-${randomBytes(4).toString('hex')}`
    await writeFile(tmp, content, 'utf-8')
    await rename(tmp, path)
  }
}
