// 테스트 전용 가짜 구글 서버: OAuth 토큰 엔드포인트 + 동기화에 쓰는 드라이브 API 일부.
// 실제 HTTP 로 띄워서 fetch·multipart·검색식(q)·토큰 만료까지 진짜와 같은 경로로 돈다.
import { createServer, type IncomingMessage, type Server } from 'http'
import type { AddressInfo } from 'net'
import type { OAuthEndpoints } from '../oauth'
import type { DriveEndpoints } from '../drive'

interface FakeFile {
  id: string
  name: string
  mimeType: string
  parents: string[]
  content: string
  trashed: boolean
}

export interface FakeGoogle {
  oauth: OAuthEndpoints
  drive: DriveEndpoints
  files: Map<string, FakeFile>
  /** 발급된 리프레시 토큰 (exchange 성공 시 추가) */
  refreshTokens: Set<string>
  /** 지금 유효한 액세스 토큰. 비우면 "만료" */
  accessTokens: Set<string>
  /** 받은 요청 "METHOD path" 기록 */
  log: string[]
  close: () => Promise<void>
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
  })

/** 드라이브 검색식 중 이 앱이 쓰는 두 모양만 해석한다 */
function matches(q: string, f: FakeFile): boolean {
  if (/trashed = false/.test(q) && f.trashed) return false
  const parent = /'([^']+)' in parents/.exec(q)
  if (parent) return f.parents.includes(parent[1])
  const mime = /mimeType = '([^']+)'/.exec(q)
  const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)
  return (!mime || f.mimeType === mime[1]) && (!name || f.name === name[1].replace(/\\(.)/g, '$1'))
}

export async function startFakeGoogle(opts: { validCode?: string } = {}): Promise<FakeGoogle> {
  const files = new Map<string, FakeFile>()
  const refreshTokens = new Set<string>()
  const accessTokens = new Set<string>()
  const log: string[] = []
  let seq = 0
  const newId = (p: string): string => `${p}${++seq}`

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const body = await readBody(req)
    log.push(`${req.method} ${url.pathname}`)
    const json = (status: number, obj: unknown): void => {
      res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(obj))
    }

    // ── 동의 화면 흉내: 바로 동의한 것처럼 리디렉트 주소로 코드를 돌려준다
    if (url.pathname === '/auth' && req.method === 'GET') {
      const back = new URL(url.searchParams.get('redirect_uri') ?? '')
      back.searchParams.set('code', opts.validCode ?? 'good-code')
      back.searchParams.set('state', url.searchParams.get('state') ?? '')
      return res.writeHead(302, { Location: back.toString() }).end()
    }

    // ── OAuth 토큰
    if (url.pathname === '/token' && req.method === 'POST') {
      const p = new URLSearchParams(body)
      const issue = (): string => {
        const t = newId('at-')
        accessTokens.add(t)
        return t
      }
      if (p.get('grant_type') === 'authorization_code') {
        if (p.get('code') !== (opts.validCode ?? 'good-code') || !p.get('code_verifier')) {
          return json(400, { error: 'invalid_grant' })
        }
        const rt = newId('rt-')
        refreshTokens.add(rt)
        return json(200, { access_token: issue(), expires_in: 3600, refresh_token: rt })
      }
      if (p.get('grant_type') === 'refresh_token') {
        if (!refreshTokens.has(p.get('refresh_token') ?? '')) {
          return json(400, {
            error: 'invalid_grant',
            error_description: 'Token has been expired or revoked.'
          })
        }
        return json(200, { access_token: issue(), expires_in: 3600 })
      }
      return json(400, { error: 'unsupported_grant_type' })
    }

    // ── 드라이브: 토큰 검사
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '')
    if (!accessTokens.has(token))
      return json(401, { error: { code: 401, message: 'Invalid Credentials' } })

    // files.list / 폴더 만들기
    if (url.pathname === '/drive/v3/files') {
      if (req.method === 'GET') {
        const q = url.searchParams.get('q') ?? ''
        return json(200, {
          files: [...files.values()]
            .filter((f) => matches(q, f))
            .map(({ id, name }) => ({ id, name }))
        })
      }
      if (req.method === 'POST') {
        const meta = JSON.parse(body)
        const f: FakeFile = {
          id: newId('fo-'),
          name: meta.name,
          mimeType: meta.mimeType,
          parents: meta.parents ?? [],
          content: '',
          trashed: false
        }
        files.set(f.id, f)
        return json(200, { id: f.id })
      }
    }
    // 내용 내려받기
    const media = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname)
    if (media && req.method === 'GET' && url.searchParams.get('alt') === 'media') {
      const f = files.get(decodeURIComponent(media[1]))
      if (!f) return json(404, { error: { code: 404 } })
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(f.content)
    }
    // multipart 만들기
    if (url.pathname === '/upload/drive/v3/files' && req.method === 'POST') {
      const boundary = /boundary=([^;]+)/.exec(req.headers['content-type'] ?? '')?.[1]
      const parts = body
        .split(`--${boundary}`)
        .slice(1, -1)
        .map((p) => p.slice(p.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, ''))
      const meta = JSON.parse(parts[0])
      const f: FakeFile = {
        id: newId('fi-'),
        name: meta.name,
        mimeType: meta.mimeType,
        parents: meta.parents ?? [],
        content: parts[1],
        trashed: false
      }
      files.set(f.id, f)
      return json(200, { id: f.id })
    }
    // 내용 바꾸기
    const upd = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname)
    if (upd && req.method === 'PATCH') {
      const f = files.get(decodeURIComponent(upd[1]))
      if (!f) return json(404, { error: { code: 404 } })
      f.content = body
      return json(200, { id: f.id })
    }
    json(404, { error: 'not found' })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    oauth: { auth: `${base}/auth`, token: `${base}/token` },
    drive: { api: `${base}/drive/v3`, upload: `${base}/upload/drive/v3` },
    files,
    refreshTokens,
    accessTokens,
    log,
    close: () => new Promise((r) => server.close(() => r()))
  }
}
