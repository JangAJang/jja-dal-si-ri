import { app, shell, BrowserWindow, dialog, powerMonitor } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { TEXT } from '../shared/labels'
import { TimerService } from './timerService'
import { createTray } from './tray'

let timerService: TimerService
let mainWindow: BrowserWindow | null = null
/** true 가 되면 창 닫기를 더 이상 막지 않는다 (실제 종료 진행 중). */
let quitting = false

// 두 번 실행되면 같은 기록 파일을 두 프로세스가 덮어쓴다 — 기존 창을 띄우고 새 프로세스는 끝낸다.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())
  app.whenReady().then(onReady)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 480,
    show: false,
    resizable: false,
    title: TEXT.appName,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  // X 버튼은 트레이로 숨기기만 한다. 타이머는 계속 돈다.
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    win.hide()
  })

  // Windows 로그오프·종료 시에는 before-quit 이 오지 않는다 — 여기서 기록을 마감한다.
  win.on('session-end', () => {
    quitting = true
    timerService.shutdown()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createWindow()
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/** 종료 요청. 기록이 진행 중이면 확인을 받은 뒤에만 종료한다. */
async function requestQuit(): Promise<void> {
  const active = timerService.active
  if (active) {
    const parent = mainWindow?.isVisible() ? mainWindow : undefined
    const options = {
      type: 'question' as const,
      title: TEXT.quitConfirmTitle,
      message: TEXT.quitConfirmMessage(active.category),
      detail: TEXT.quitConfirmDetail,
      buttons: [TEXT.quitConfirmOk, TEXT.quitConfirmCancel],
      defaultId: 1,
      cancelId: 1
    }
    const { response } = parent
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
    if (response !== 0) return
  }
  quitting = true
  app.quit()
}

function onReady(): void {
  electronApp.setAppUserModelId('com.muhayu.timekeeper')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  timerService = new TimerService()
  timerService.register()

  mainWindow = createWindow()
  createTray(timerService, { open: showMainWindow, quit: () => void requestQuit() })

  // mac: 시스템 종료·재시작 시에는 확인창 없이 마감한다.
  powerMonitor.on('shutdown', () => {
    quitting = true
    timerService.shutdown()
  })

  app.on('activate', () => showMainWindow())
}

// 트레이 외의 경로(mac Cmd+Q, Dock 종료)로 들어온 종료도 같은 확인을 거친다.
app.on('before-quit', (e) => {
  if (!quitting && timerService?.active) {
    e.preventDefault()
    void requestQuit()
    return
  }
  quitting = true
  // 앱이 꺼지면 진행 중인 기록을 그 시각으로 마감한다 (설계: 앱 종료 시 자동 종료).
  timerService?.shutdown()
})
