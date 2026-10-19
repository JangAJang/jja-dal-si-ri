// "내 키로 연결"을 쉽게 (#25). 순수 함수만 — main·renderer 양쪽에서 쓴다.
//
// 1) 구글 콘솔에서 받은 키 파일(client_secret_….json)을 읽어 ID·비밀번호를 채운다.
// 2) 연결한 컴퓨터에서 "연결 코드"를 만들어 다른 컴퓨터에 붙여 넣는다.
//    코드에는 클라이언트 ID·비밀번호만 들어간다 (로그인 토큰은 아님 — 컴퓨터마다 각자 로그인).
//    데스크톱 앱의 비밀번호는 구글도 "지킬 수 없는 값"으로 보지만, 남에게 보여줄 값은 아니다.

export interface ClientKey {
  clientId: string
  clientSecret?: string
}

export type KeyFileError = 'not_json' | 'wrong_type' | 'missing_id'

/**
 * 구글 콘솔의 키 파일: 데스크톱 앱은 { "installed": { client_id, client_secret, ... } }.
 * 웹 애플리케이션 유형({ "web": ... })은 루프백 로그인이 안 되므로 거절한다.
 */
export function parseKeyFile(text: string): ClientKey | KeyFileError {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return 'not_json'
  }
  const o = raw as Record<string, Record<string, unknown> | undefined>
  if (!o || typeof o !== 'object') return 'not_json'
  if (!o.installed) return o.web ? 'wrong_type' : 'missing_id'
  const id = o.installed.client_id
  const secret = o.installed.client_secret
  if (typeof id !== 'string' || !id) return 'missing_id'
  return { clientId: id, clientSecret: typeof secret === 'string' && secret ? secret : undefined }
}

const PREFIX = 'JJT1-'

const toBase64Url = (s: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (s: string): string => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeConnectionCode(key: ClientKey): string {
  return PREFIX + toBase64Url(JSON.stringify({ i: key.clientId, s: key.clientSecret ?? '' }))
}

/** 붙여 넣은 연결 코드 → 키. 앞뒤 공백·줄바꿈은 무시. 이 앱의 코드가 아니면 null. */
export function decodeConnectionCode(code: string): ClientKey | null {
  const c = code.trim()
  if (!c.startsWith(PREFIX)) return null
  try {
    const o = JSON.parse(fromBase64Url(c.slice(PREFIX.length))) as { i?: unknown; s?: unknown }
    if (typeof o.i !== 'string' || !o.i) return null
    return { clientId: o.i, clientSecret: typeof o.s === 'string' && o.s ? o.s : undefined }
  } catch {
    return null
  }
}
