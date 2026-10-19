import { useEffect } from 'react'
import { MESSAGES } from '../../shared/labels'
import { shellTokens } from '../../shared/theme'
import { parseViewMode } from '../../shared/view'
import { useNow, useSettings, useTimerState } from './hooks'
import { MessagesContext } from './i18n'
import { AnalogMini } from './views/AnalogMini'
import { DigitalMini } from './views/DigitalMini'
import { MainView } from './views/MainView'

// 창마다 같은 index.html 을 열고, URL 해시로 어떤 화면을 그릴지 정한다 (src/main/windows.ts).
const mode = parseViewMode(window.location.hash)
document.body.dataset.view = mode

/** 설정의 본체 색 → main.css 의 --shell 계열 변수 (기본·미니 모든 창 공통). */
function useShellColor(hex: string | undefined): void {
  useEffect(() => {
    if (!hex) return
    const t = shellTokens(hex)
    const root = document.documentElement.style
    root.setProperty('--shell', t.shell)
    root.setProperty('--shell-edge', t.shellEdge)
    root.setProperty('--shell-shade', t.shellShade)
    root.setProperty('--ink', t.ink)
    root.setProperty('--body-ink', t.ink)
    root.setProperty('--ink-soft', t.inkSoft)
  }, [hex])
}

function App(): React.JSX.Element {
  const state = useTimerState()
  const settings = useSettings()
  const now = useNow()
  useShellColor(settings?.shellColor)

  const locale = settings?.resolvedLocale
  useEffect(() => {
    if (!locale) return
    document.documentElement.lang = locale
    document.title = MESSAGES[locale].appName // <title> 이 창 제목을 덮으므로 함께 바꾼다
  }, [locale])

  if (!state || !settings) return <main className="app" />
  const view =
    mode === 'digital' ? (
      <DigitalMini state={state} now={now} />
    ) : mode === 'analog' ? (
      <AnalogMini state={state} now={now} />
    ) : (
      <MainView state={state} settings={settings} now={now} />
    )
  return (
    <MessagesContext.Provider value={MESSAGES[settings.resolvedLocale]}>
      {view}
    </MessagesContext.Provider>
  )
}

export default App
