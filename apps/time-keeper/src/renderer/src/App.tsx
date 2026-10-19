import { useEffect } from 'react'
import { shellTokens } from '../../shared/theme'
import { parseViewMode } from '../../shared/view'
import { useNow, useSettings, useTimerState } from './hooks'
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

  if (!state || !settings) return <main className="app" />
  if (mode === 'digital') return <DigitalMini state={state} now={now} />
  if (mode === 'analog') return <AnalogMini state={state} now={now} />
  return <MainView state={state} settings={settings} now={now} />
}

export default App
