import {
  CORNERS,
  DWELL_MAX_MS,
  DWELL_MIN_MS,
  LANGUAGES,
  PANEL_SIZES,
  type Settings
} from '../../../shared/settings'
import { useSettings } from '../hooks'
import { useT } from '../i18n'

// 설정 창 (#settings). 바꾸는 즉시 main 이 저장하고 모든 창에 알린다.
export default function SettingsView(): React.JSX.Element {
  const settings = useSettings()
  const t = useT()
  if (!settings) return <main className="settings" />
  const set = (patch: Partial<Settings>): void => void window.api.setSettings(patch)

  const toggle = (
    key: 'showTray' | 'contentProtection' | 'showErrors',
    label: string
  ): React.JSX.Element => (
    <label className="check">
      <input
        type="checkbox"
        checked={settings[key]}
        onChange={(e) => set({ [key]: e.target.checked })}
      />
      {label}
    </label>
  )

  return (
    <main className="settings">
      <section>
        <h2>{t.settings.corner}</h2>
        <div className="corner-picker" role="radiogroup" aria-label={t.settings.corner}>
          {CORNERS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={settings.corner === c}
              className={`corner corner-${c}`}
              title={t.settings.corners[c]}
              onClick={() => set({ corner: c })}
            >
              <span className="sr">{t.settings.corners[c]}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          {t.settings.corners[settings.corner]} · {t.settings.cornerHint}
        </p>
      </section>

      <section>
        <h2>
          {t.settings.dwell} <span className="value">{t.settings.seconds(settings.dwellMs)}</span>
        </h2>
        <input
          type="range"
          min={DWELL_MIN_MS}
          max={DWELL_MAX_MS}
          step={100}
          value={settings.dwellMs}
          onChange={(e) => set({ dwellMs: Number(e.target.value) })}
        />
      </section>

      <section>
        <h2>{t.settings.panelSize}</h2>
        <div className="segmented">
          {PANEL_SIZES.map((s) => (
            <button
              key={s}
              className="control"
              aria-pressed={settings.panelSize === s}
              onClick={() => set({ panelSize: s })}
            >
              {t.settings.sizes[s]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>{t.settings.language}</h2>
        <div className="segmented">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              className="control"
              aria-pressed={settings.language === l}
              onClick={() => set({ language: l })}
            >
              {t.settings.languages[l]}
            </button>
          ))}
        </div>
      </section>

      <section>
        {toggle('showTray', t.settings.showTray)}
        {!settings.showTray && <p className="hint">{t.settings.trayHint}</p>}
        {toggle('contentProtection', t.settings.contentProtection)}
        {toggle('showErrors', t.settings.showErrors)}
      </section>

      <button className="control quit" onClick={() => window.api.quit()}>
        {t.settings.quit}
      </button>
    </main>
  )
}
