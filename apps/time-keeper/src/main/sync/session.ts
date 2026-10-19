// 로그인 세션: 리프레시 토큰으로 액세스 토큰을 필요할 때 받아 온다. Electron 에 의존하지 않는다.
import { refreshAccessToken, type OAuthClient, type OAuthEndpoints, type Tokens } from './oauth'

/** 만료 직전 토큰으로 요청하다 실패하지 않게 이만큼 일찍 갱신한다 */
const EARLY_REFRESH_MS = 60_000

export class GoogleSession {
  private tokens: Tokens | null = null
  private pending: Promise<string> | null = null

  constructor(
    readonly client: OAuthClient,
    readonly refreshToken: string,
    private readonly endpoints: OAuthEndpoints,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  /** 유효한 액세스 토큰. 동시에 여러 번 불려도 갱신 요청은 한 번만 보낸다. */
  accessToken = (): Promise<string> => {
    if (this.tokens && this.tokens.expiresAt - EARLY_REFRESH_MS > Date.now()) {
      return Promise.resolve(this.tokens.accessToken)
    }
    this.pending ??= refreshAccessToken(
      this.endpoints,
      this.client,
      this.refreshToken,
      this.fetchImpl
    )
      .then((t) => {
        this.tokens = t
        return t.accessToken
      })
      .finally(() => {
        this.pending = null
      })
    return this.pending
  }

  /** 서버가 401 을 주면 받아 둔 토큰을 버려 다음 요청에서 새로 받게 한다 */
  invalidate(): void {
    this.tokens = null
  }
}
