import { describe, expect, it } from 'vitest'
import { en, ko, resolveLocale } from './labels'

describe('resolveLocale', () => {
  it('직접 고른 언어가 우선', () => {
    expect(resolveLocale('ko', 'en-US')).toBe('ko')
    expect(resolveLocale('en', 'ko-KR')).toBe('en')
  })

  it('시스템 언어: 한국어면 한국어, 그 밖은 영어', () => {
    expect(resolveLocale('system', 'ko-KR')).toBe('ko')
    expect(resolveLocale('system', 'ko')).toBe('ko')
    expect(resolveLocale('system', 'en-US')).toBe('en')
    expect(resolveLocale('system', 'ja-JP')).toBe('en')
    expect(resolveLocale('system', '')).toBe('en')
  })
})

describe('문구 묶음', () => {
  // 형식은 타입이 지키지만, 빈 문자열로 채워 둔 실수는 못 잡으니 확인한다.
  const leaves = (o: unknown, path = ''): [string, unknown][] =>
    o && typeof o === 'object'
      ? Object.entries(o).flatMap(([k, v]) => leaves(v, `${path}.${k}`))
      : [[path, o]]

  it('두 언어의 키가 같고 빈 문구가 없다', () => {
    const k = leaves(ko)
    const e = leaves(en)
    expect(e.map(([p]) => p)).toEqual(k.map(([p]) => p))
    for (const [p, v] of [...k, ...e]) {
      if (typeof v === 'string') expect(v.trim(), p).not.toBe('')
    }
  })

  it('함수 문구', () => {
    expect(ko.settings.seconds(500)).toBe('0.5초')
    expect(en.settings.seconds(1500)).toBe('1.5s')
  })
})
