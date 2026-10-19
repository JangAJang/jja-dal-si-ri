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

  it('타입이 다른 값은 무시', () => {
    expect(normalizeSettings({ reportCollapsed: 'yes' }).reportCollapsed).toBe(false)
    expect(normalizeSettings({ reportCollapsed: true }).reportCollapsed).toBe(true)
  })
})
