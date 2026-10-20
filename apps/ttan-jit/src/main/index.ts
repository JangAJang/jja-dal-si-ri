import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// 패널 창 하나. 핫존 감지·숨김은 #33, 설정·트레이는 #36에서 붙인다.
let panel: BrowserWindow | null = null

function createPanel(): void {
  panel = new BrowserWindow({
    width: 360,
    height: 400,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  panel.on('ready-to-show', () => panel?.show())
  panel.on('closed', () => (panel = null))

  panel.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    panel.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    panel.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 단일 인스턴스 — 두 번째 실행은 첫 인스턴스에 알리고 끝난다 (트레이를 숨겼을 때의 복구 경로, #36).
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (panel) panel.show()
    else createPanel()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.muhayu.ttanjit')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    createPanel()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createPanel()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
