import { useState } from 'react'
import type { LocalePreference, Settings, SettingsSnapshot } from '../../../shared/settings'
import { LOCALES } from '../../../shared/labels'
import { SHELL_PRESETS, clampChannel, hexToRgb, rgbToHex, type Rgb } from '../../../shared/theme'
import { useT } from '../i18n'

const CHANNELS = ['r', 'g', 'b'] as const
const LOCALE_CHOICES: LocalePreference[] = ['auto', ...LOCALES]

/** 본체 색: 프리셋을 누르거나 R·G·B(0~255)를 직접 넣는다. 바꾸면 바로 모든 창에 적용된다. */
function ShellColor({ hex }: { hex: string }): React.JSX.Element {
  const t = useT()
  const rgb = hexToRgb(hex) as Rgb
  // 입력칸은 타이핑 중 빈칸·잘못된 값을 허용해야 해서 비제어(defaultValue)로 둔다.
  // 입력칸 묶음의 key 는 보통 현재 색이라, 프리셋 등으로 색이 바뀌면(설정이 main 에서 돌아온 뒤)
  // 새 값으로 다시 그려진다. 단 사용자가 타이핑해서 바꾼 색이면 key 를 유지해 입력 중 포커스를 잃지 않는다.
  const [typed, setTyped] = useState<{ hex: string; key: string } | null>(null)
  const inputsKey = typed && typed.hex === hex ? typed.key : hex
  const setColor = (next: string): Promise<Settings> => window.api.setSettings({ shellColor: next })

  return (
    <section className="panel">
      <h2>{t.settingsShell}</h2>
      <div className="presets">
        {SHELL_PRESETS.map((p, i) => (
          <button
            key={p}
            className={p === hex ? 'preset is-on' : 'preset'}
            style={{ background: p }}
            title={t.presetNames[i]}
            aria-label={t.presetNames[i]}
            aria-pressed={p === hex}
            onClick={() => setColor(p)}
          />
        ))}
      </div>
      <div className="rgb" key={inputsKey}>
        {CHANNELS.map((ch) => (
          <label key={ch}>
            <span>{ch.toUpperCase()}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={255}
              defaultValue={rgb[ch]}
              onChange={(e) => {
                const v = e.target.value.trim()
                const n = Number(v)
                if (v !== '' && Number.isInteger(n) && n >= 0 && n <= 255) {
                  const next = rgbToHex({ ...rgb, [ch]: clampChannel(n) })
                  setTyped({ hex: next, key: inputsKey })
                  setColor(next)
                }
              }}
              // 칸을 떠나면 key 가 현재 색으로 돌아가 잘못 친 값이 지워진다
              onBlur={() => setTyped(null)}
            />
          </label>
        ))}
        <span className="rgb-chip" style={{ background: hex }} aria-hidden />
        <code className="rgb-hex">{hex}</code>
      </div>
      <p className="hint">{t.settingsShellHint}</p>
    </section>
  )
}

/** 언어: 시스템 따라가기 / 한국어 / English (#8). 언어 이름은 각 언어로 쓴다. */
function Language({ value }: { value: LocalePreference }): React.JSX.Element {
  const t = useT()
  return (
    <section className="panel">
      <h2>{t.settingsLanguage}</h2>
      <div className="segmented light" role="radiogroup" aria-label={t.settingsLanguage}>
        {LOCALE_CHOICES.map((l) => (
          <button
            key={l}
            role="radio"
            aria-checked={value === l}
            className={value === l ? 'is-on' : ''}
            onClick={() => window.api.setSettings({ locale: l })}
          >
            {t.languageName[l]}
          </button>
        ))}
      </div>
    </section>
  )
}

export function SettingsView({ settings }: { settings: SettingsSnapshot }): React.JSX.Element {
  return (
    <div className="settings">
      <ShellColor hex={settings.shellColor} />
      <Language value={settings.locale} />
    </div>
  )
}
