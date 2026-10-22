import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DWELL_MAX_MS,
  DWELL_MIN_MS,
  normalizeSettings,
  panelSizeOf
} from './settings'

describe('normalizeSettings', () => {
  it('빈 값·깨진 값은 기본값', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('x')).toEqual(DEFAULT_SETTINGS)
    expect(
      normalizeSettings({
        corner: 'middle',
        panelSize: 'huge',
        showTray: 'yes',
        dwellMs: 'fast',
        opacity: null,
        language: 'fr',
        displayId: 'main'
      })
    ).toEqual(DEFAULT_SETTINGS)
  })

  it('맞는 값은 그대로', () => {
    const s = {
      version: 1,
      displayId: 2779098405,
      corner: 'bottom-left',
      dwellMs: 800,
      panelSize: 'large',
      opacity: 0.6,
      showTray: false,
      contentProtection: false,
      showErrors: false,
      language: 'en'
    }
    expect(normalizeSettings(s)).toEqual(s)
  })

  it('진하기는 0.2~1, 5% 단위로', () => {
    expect(normalizeSettings({ opacity: 0 }).opacity).toBe(0.2)
    expect(normalizeSettings({ opacity: 3 }).opacity).toBe(1)
    expect(normalizeSettings({ opacity: 0.62 }).opacity).toBe(0.6)
    expect(normalizeSettings({ opacity: 'x' }).opacity).toBe(1)
  })

  it('지연은 범위 안으로 자르고 정수로', () => {
    expect(normalizeSettings({ dwellMs: 10 }).dwellMs).toBe(DWELL_MIN_MS)
    expect(normalizeSettings({ dwellMs: 99999 }).dwellMs).toBe(DWELL_MAX_MS)
    expect(normalizeSettings({ dwellMs: 612.7 }).dwellMs).toBe(613)
    expect(normalizeSettings({ dwellMs: NaN }).dwellMs).toBe(DEFAULT_SETTINGS.dwellMs)
  })
})

describe('panelSizeOf', () => {
  it('크기 단계별 창 크기', () => {
    expect(panelSizeOf(DEFAULT_SETTINGS)).toEqual({ width: 360, height: 400 })
    expect(panelSizeOf({ ...DEFAULT_SETTINGS, panelSize: 'small' })).toEqual({
      width: 306,
      height: 340
    })
    expect(panelSizeOf({ ...DEFAULT_SETTINGS, panelSize: 'large' })).toEqual({
      width: 432,
      height: 480
    })
  })
})
