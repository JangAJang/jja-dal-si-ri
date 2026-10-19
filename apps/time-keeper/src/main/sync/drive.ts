// 구글 드라이브 REST v3 중 동기화에 필요한 것만. 주소는 바꿔 끼울 수 있어 가짜 서버로 테스트한다.
// 근거: https://developers.google.com/workspace/drive/api/reference/rest/v3/files

export interface DriveEndpoints {
  /** 예: https://www.googleapis.com/drive/v3 */
  api: string
  /** 예: https://www.googleapis.com/upload/drive/v3 */
  upload: string
}

export const GOOGLE_DRIVE: DriveEndpoints = {
  api: 'https://www.googleapis.com/drive/v3',
  upload: 'https://www.googleapis.com/upload/drive/v3'
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'

export interface DriveFile {
  id: string
  name: string
}

export class DriveError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

/** 작은 따옴표를 쓰는 드라이브 검색식 안의 문자열 이스케이프 */
const quote = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

export class DriveClient {
  constructor(
    private readonly accessToken: () => Promise<string>,
    private readonly endpoints: DriveEndpoints = GOOGLE_DRIVE,
    private readonly fetchImpl: typeof fetch = fetch,
    /** 401 을 받으면 불린다 (받아 둔 토큰 버리기). 그 뒤 한 번만 다시 시도한다. */
    private readonly onUnauthorized?: () => void
  ) {}

  private async request(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
    const token = await this.accessToken()
    const res = await this.fetchImpl(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` }
    })
    if (res.status === 401 && this.onUnauthorized && !retried) {
      this.onUnauthorized()
      return this.request(url, init, true)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new DriveError(res.status, `drive ${res.status}: ${text.slice(0, 200)}`)
    }
    return res
  }

  private async list(q: string): Promise<DriveFile[]> {
    const files: DriveFile[] = []
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken, files(id, name)',
        pageSize: '100',
        spaces: 'drive'
      })
      if (pageToken) params.set('pageToken', pageToken)
      const json = (await (await this.request(`${this.endpoints.api}/files?${params}`)).json()) as {
        files?: DriveFile[]
        nextPageToken?: string
      }
      files.push(...(json.files ?? []))
      pageToken = json.nextPageToken
    } while (pageToken)
    return files
  }

  /** 이름이 같은 앱 폴더를 찾고 없으면 만든다 */
  async ensureFolder(name: string): Promise<string> {
    const found = await this.list(
      `mimeType = ${quote(FOLDER_MIME)} and name = ${quote(name)} and trashed = false`
    )
    if (found.length > 0) return found[0].id
    const res = await this.request(`${this.endpoints.api}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME })
    })
    return ((await res.json()) as { id: string }).id
  }

  listChildren(folderId: string): Promise<DriveFile[]> {
    return this.list(`${quote(folderId)} in parents and trashed = false`)
  }

  async download(fileId: string): Promise<string> {
    return (
      await this.request(`${this.endpoints.api}/files/${encodeURIComponent(fileId)}?alt=media`)
    ).text()
  }

  /** JSON 파일 새로 만들기 (메타데이터 + 내용을 multipart 한 번에) */
  async createJson(folderId: string, name: string, content: string): Promise<string> {
    const boundary = `tk-${Math.random().toString(36).slice(2)}`
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name, parents: [folderId], mimeType: 'application/json' }) +
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
      content +
      `\r\n--${boundary}--`
    const res = await this.request(
      `${this.endpoints.upload}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
      }
    )
    return ((await res.json()) as { id: string }).id
  }

  /** 있는 파일의 내용만 바꾸기 */
  async updateJson(fileId: string, content: string): Promise<void> {
    await this.request(
      `${this.endpoints.upload}/files/${encodeURIComponent(fileId)}?uploadType=media`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: content }
    )
  }
}
