import { describe, expect, it } from 'vitest'
import { en, headline, ko, resolveLocale, statusText } from './labels'

const studying = { id: 'a', category: 'study' as const, startedAt: 0, lastHeartbeatAt: 0 }

describe('statusText', () => {
  it('진행 중이 아니면 대기 문구', () => {
    expect(statusText(ko, null, 0)).toBe('멍 때리는 중')
    expect(statusText(en, null, 0)).toBe('Zoning out')
  })

  it('진행 중이면 분야와 경과 시간', () => {
    expect(statusText(ko, studying, 5_025_000)).toBe('뇌 키우는 중 🧠 01:23:45')
    expect(statusText(en, studying, 5_025_000)).toBe('Growing brain 🧠 01:23:45')
  })
})

describe('headline', () => {
  it('진행 중 > 준비 > 대기', () => {
    expect(headline(ko, studying, 'work')).toBe('● 뇌 키우는 중 🧠')
    expect(headline(en, null, 'break')).toBe('Catch my breath')
    expect(headline(en, null, null)).toBe('Zoning out')
  })
})

describe('resolveLocale', () => {
  it('설정이 auto 면 시스템 언어: 한국어면 ko, 그 밖은 en', () => {
    expect(resolveLocale('auto', 'ko-KR')).toBe('ko')
    expect(resolveLocale('auto', 'ko')).toBe('ko')
    expect(resolveLocale('auto', 'en-US')).toBe('en')
    expect(resolveLocale('auto', 'ja-JP')).toBe('en')
  })

  it('직접 고른 언어가 우선', () => {
    expect(resolveLocale('en', 'ko-KR')).toBe('en')
    expect(resolveLocale('ko', 'en-US')).toBe('ko')
  })
})

describe('번역 묶음', () => {
  it('두 언어의 문구 항목이 같다', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort())
    expect(en.weekday).toHaveLength(7)
    expect(en.presetNames).toHaveLength(ko.presetNames.length)
  })

  it('영어 날짜 제목', () => {
    expect(en.dayTitle(new Date(2026, 9, 21).getTime())).toBe('Wed, Oct 21')
    expect(ko.dayTitle(new Date(2026, 9, 21).getTime())).toBe('10월 21일 (수)')
  })
})
