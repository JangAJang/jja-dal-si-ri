import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import SettingsView from './views/SettingsView'

// 같은 렌더러를 두 창이 쓴다: 패널(기본)과 설정 창(#settings).
const isSettings = location.hash === '#settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isSettings ? <SettingsView /> : <App />}</StrictMode>
)
