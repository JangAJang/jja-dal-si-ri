import { BrowserWindow, app, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { ko as t } from '../shared/labels'

// 설정 창 — 평범한 창 하나. 트레이 메뉴·패널 톱니바퀴·두 번째 실행에서 연다.
// 트레이를 꺼도 앱을 한 번 더 실행하면 이 창이 떠서 되돌릴 수 있다 (docs/design.md > 흔적 지우기).
let win: BrowserWindow | null = null

export function openSettingsWindow(): void {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    return
  }
  win = new BrowserWindow({
    width: 380,
    height: 520,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: t.settings.windowTitle,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // 렌더러 <title> 이 창 제목을 덮지 않게.
  win.on('page-title-updated', (e) => e.preventDefault())
  win.on('ready-to-show', () => {
    win?.show()
    // mac 은 Dock 이 없는 앱이라 앞으로 끌어와야 창이 보인다.
    if (process.platform === 'darwin') app.focus({ steal: true })
    win?.focus()
  })
  win.on('closed', () => (win = null))
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#settings`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'settings' })
  }
}
