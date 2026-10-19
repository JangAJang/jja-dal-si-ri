import { describe, expect, it } from 'vitest'
import { decodeConnectionCode, encodeConnectionCode, parseKeyFile } from './connectionCode'

describe('parseKeyFile', () => {
  it('데스크톱 앱 키 파일에서 ID·비밀번호를 읽는다', () => {
    const file = JSON.stringify({
      installed: {
        client_id: '123-abc.apps.googleusercontent.com',
        client_secret: 'GOCSPX-xyz',
        redirect_uris: ['http://localhost']
      }
    })
    expect(parseKeyFile(file)).toEqual({
      clientId: '123-abc.apps.googleusercontent.com',
      clientSecret: 'GOCSPX-xyz'
    })
  })

  it('웹 애플리케이션 유형은 거절 (데스크톱 앱으로 만들어야 함)', () => {
    expect(parseKeyFile(JSON.stringify({ web: { client_id: 'x' } }))).toBe('wrong_type')
  })

  it('JSON 이 아니거나 ID 가 없으면 오류 코드', () => {
    expect(parseKeyFile('hello')).toBe('not_json')
    expect(parseKeyFile(JSON.stringify({ installed: {} }))).toBe('missing_id')
  })
})

describe('연결 코드', () => {
  it('왕복 (비밀번호 포함·미포함)', () => {
    const key = { clientId: '123-abc.apps.googleusercontent.com', clientSecret: 'GOCSPX-xyz' }
    expect(decodeConnectionCode(encodeConnectionCode(key))).toEqual(key)
    expect(decodeConnectionCode(encodeConnectionCode({ clientId: 'only-id' }))).toEqual({
      clientId: 'only-id',
      clientSecret: undefined
    })
  })

  it('붙여 넣을 때 섞인 공백·줄바꿈은 무시', () => {
    const code = encodeConnectionCode({ clientId: 'abc' })
    expect(decodeConnectionCode(`  ${code}\n`)).toEqual({
      clientId: 'abc',
      clientSecret: undefined
    })
  })

  it('이 앱 코드가 아니거나 깨졌으면 null', () => {
    expect(decodeConnectionCode('hello')).toBeNull()
    expect(decodeConnectionCode('JJT1-!!!')).toBeNull()
  })
})
