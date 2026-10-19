import { app, dialog, powerMonitor } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { SettingsService } from './settingsService'
import { TimerService } from './timerService'
import { createTray } from './tray'
import {
  initWindows,
  isQuitting,
  markQuitting,
  openView,
  setWindowTitles,
  visibleWindow
} from './windows'

let timerService: TimerService
let settingsService: SettingsService

// 두 번 실행되면 같은 기록 파일을 두 프로세스가 덮어쓴다 — 기존 창을 띄우고 새 프로세스는 끝낸다.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => openView('main'))
  app.whenReady().then(onReady)
}

/** 종료 요청. 기록이 진행 중이면 확인을 받은 뒤에만 종료한다. */
async function requestQuit(): Promise<void> {
  const active = timerService.active
  const t = settingsService.messages
  if (active) {
    const parent = visibleWindow()
    const options = {
      type: 'question' as const,
      title: t.quitConfirmTitle,
      message: t.quitInterrupt[active.category],
      detail: t.quitConfirmDetail,
      buttons: [t.quitConfirmOk, t.quitConfirmCancel],
      defaultId: 1,
      cancelId: 1
    }
    const { response } = parent
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
    if (response !== 0) return
  }
  markQuitting()
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
  settingsService = new SettingsService()
  settingsService.register()

  initWindows({
    onSessionEnd: () => timerService.shutdown(),
    title: () => settingsService.messages.appName
  })
  settingsService.onChange(() => setWindowTitles(settingsService.messages.appName))
  openView('main')
  createTray(timerService, settingsService, { open: openView, quit: () => void requestQuit() })

  // mac: 시스템 종료·재시작 시에는 확인창 없이 마감한다.
  powerMonitor.on('shutdown', () => {
    markQuitting()
    timerService.shutdown()
  })

  app.on('activate', () => openView('main'))
}

// 트레이 외의 경로(mac Cmd+Q, Dock 종료)로 들어온 종료도 같은 확인을 거친다.
app.on('before-quit', (e) => {
  if (!isQuitting() && timerService?.active) {
    e.preventDefault()
    void requestQuit()
    return
  }
  markQuitting()
  // 앱이 꺼지면 진행 중인 기록을 그 시각으로 마감한다 (설계: 앱 종료 시 자동 종료).
  timerService?.shutdown()
})
