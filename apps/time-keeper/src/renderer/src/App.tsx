import { parseViewMode } from '../../shared/view'
import { useNow, useTimerState } from './hooks'
import { AnalogMini } from './views/AnalogMini'
import { DigitalMini } from './views/DigitalMini'
import { MainView } from './views/MainView'

// 창마다 같은 index.html 을 열고, URL 해시로 어떤 화면을 그릴지 정한다 (src/main/windows.ts).
const mode = parseViewMode(window.location.hash)
document.body.dataset.view = mode

function App(): React.JSX.Element {
  const state = useTimerState()
  const now = useNow()

  if (!state) return <main className="app" />
  if (mode === 'digital') return <DigitalMini state={state} now={now} />
  if (mode === 'analog') return <AnalogMini state={state} now={now} />
  return <MainView state={state} now={now} />
}

export default App
