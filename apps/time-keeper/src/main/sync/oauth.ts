// 구글 OAuth (데스크톱 앱: 루프백 리디렉트 + PKCE). Electron 에 의존하지 않아 테스트할 수 있다.
// 근거: https://developers.google.com/identity/protocols/oauth2/native-app
import { createHash, randomBytes } from 'crypto'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

export interface OAuthEndpoints {
  auth: string
  token: string
}

export const GOOGLE_ENDPOINTS: OAuthEndpoints = {
  auth: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token'
}

/** 사용자가 직접 발급해 넣는 OAuth 클라이언트 (Google Cloud 의 "데스크톱 앱" 유형) */
export interface OAuthClient {
  clientId: string
  /** 데스크톱 클라이언트의 비밀키. 구글 문서상 선택이지만 발급되면 함께 보낸다. */
  clientSecret?: string
}

const base64url = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** PKCE: verifier(43~128자)와 S256 challenge */
export function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(48)) // 64자
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function buildAuthUrl(
  endpoints: OAuthEndpoints,
  client: OAuthClient,
  redirectUri: string,
  challenge: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DRIVE_FILE_SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    // 리프레시 토큰을 받으려면 offline + 처음 동의 화면
    access_type: 'offline',
    prompt: 'consent'
  })
  return `${endpoints.auth}?${params}`
}

export interface Tokens {
  accessToken: string
  /** epoch ms. 여유를 두고 이보다 일찍 갱신한다. */
  expiresAt: number
  refreshToken?: string
}

async function tokenRequest(
  endpoints: OAuthEndpoints,
  client: OAuthClient,
  body: Record<string, string>,
  fetchImpl: typeof fetch
): Promise<Tokens> {
  const params = new URLSearchParams({ client_id: client.clientId, ...body })
  if (client.clientSecret) params.set('client_secret', client.clientSecret)
  const res = await fetchImpl(endpoints.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok || typeof json.access_token !== 'string') {
    throw new OAuthError(String(json.error ?? res.status), String(json.error_description ?? ''))
  }
  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + Number(json.expires_in ?? 3600) * 1000,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : undefined
  }
}

/** 토큰 엔드포인트가 거절한 경우. code 는 구글의 error 값 (예: invalid_grant = 로그인 만료·철회) */
export class OAuthError extends Error {
  constructor(
    readonly code: string,
    description: string
  ) {
    super(description ? `${code}: ${description}` : code)
  }
}

export function exchangeCode(
  endpoints: OAuthEndpoints,
  client: OAuthClient,
  code: string,
  verifier: string,
  redirectUri: string,
  fetchImpl: typeof fetch = fetch
): Promise<Tokens> {
  return tokenRequest(
    endpoints,
    client,
    { grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri },
    fetchImpl
  )
}

export function refreshAccessToken(
  endpoints: OAuthEndpoints,
  client: OAuthClient,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<Tokens> {
  return tokenRequest(
    endpoints,
    client,
    { grant_type: 'refresh_token', refresh_token: refreshToken },
    fetchImpl
  )
}

/**
 * 127.0.0.1 의 빈 포트에서 구글의 리디렉트(?code=…&state=…)를 한 번 받는다.
 * 브라우저에는 짧은 안내 페이지를 돌려주고 서버는 닫는다.
 */
export async function listenForCode(
  expectedState: string,
  pages: { ok: string; fail: string },
  timeoutMs = 5 * 60_000
): Promise<{ redirectUri: string; code: Promise<string>; close: () => void }> {
  let settle: { resolve: (c: string) => void; reject: (e: Error) => void }
  const code = new Promise<string>((resolve, reject) => (settle = { resolve, reject }))
  // 콜백은 나중에 불리므로 아래에서 선언하는 server 를 써도 된다
  const timer = setTimeout(() => {
    settle.reject(new Error('timeout'))
    server.close()
  }, timeoutMs)

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (url.pathname !== '/') {
      res.writeHead(404).end()
      return
    }
    const got = url.searchParams.get('code')
    const ok = !!got && url.searchParams.get('state') === expectedState
    res
      .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      .end(ok ? pages.ok : pages.fail)
    clearTimeout(timer)
    server.close()
    if (ok) settle.resolve(got as string)
    else settle.reject(new Error(url.searchParams.get('error') ?? 'state_mismatch'))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    redirectUri: `http://127.0.0.1:${port}`,
    code,
    // 취소: 기다리던 쪽이 끝나도록 cancelled 로 거절한다 (이미 끝났으면 아무 일 없음)
    close: () => {
      clearTimeout(timer)
      server.close()
      settle.reject(new Error('cancelled'))
    }
  }
}
