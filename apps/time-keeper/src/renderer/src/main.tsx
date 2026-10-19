import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// 파일을 창에 떨어뜨리면 Electron 기본 동작은 그 파일로 페이지를 바꿔 버린다.
// 받을 곳(키 파일 놓는 칸)은 자기 onDrop 에서 따로 처리하고, 나머지는 여기서 막는다.
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
