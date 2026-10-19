import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings } from './settings'

describe('normalizeSettings', () => {
  it('비어 있거나 망가진 값은 기본값', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('garbage')).toEqual(DEFAULT_SETTINGS)
  })

  it('색은 대문자 #RRGGBB 로, 잘못된 색은 기본값으로', () => {
    expect(normalizeSettings({ shellColor: '#f1e3b0' }).shellColor).toBe('#F1E3B0')
    expect(normalizeSettings({ shellColor: 'red' }).shellColor).toBe(DEFAULT_SETTINGS.shellColor)
  })

  it('언어는 auto·ko·en 만, 그 밖은 auto', () => {
    expect(normalizeSettings({ locale: 'en' }).locale).toBe('en')
    expect(normalizeSettings({ locale: 'fr' }).locale).toBe('auto')
  })

  it('자동 이어받기는 기본 켜짐', () => {
    expect(normalizeSettings({}).autoHandoff).toBe(true)
    expect(normalizeSettings({ autoHandoff: false }).autoHandoff).toBe(false)
  })

  it('타입이 다른 값은 무시', () => {
    expect(normalizeSettings({ reportCollapsed: 'yes' }).reportCollapsed).toBe(false)
    expect(normalizeSettings({ reportCollapsed: true }).reportCollapsed).toBe(true)
  })
})
