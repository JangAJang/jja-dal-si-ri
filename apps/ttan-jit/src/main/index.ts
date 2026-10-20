import { app, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC } from '../shared/ipc'
import { applyPanelSettings, startPanel, stopPanel } from './panel'
import { flushGames, registerGameStore } from './gameStore'
import { getSettings, onSettingsChange, startSettings } from './settingsService'
import { openSettingsWindow } from './settingsWindow'
import { setTrayVisible } from './tray'

const trayActions = { openSettings: openSettingsWindow, quit: () => app.quit() }

// 단일 인스턴스 — 두 번째 실행은 첫 인스턴스에 알리고 끝난다.
// 첫 인스턴스는 설정 창을 띄운다 (트레이를 숨겼을 때의 복구 경로).
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', openSettingsWindow)

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.muhayu.ttanjit')
    // Dock 에 나타나지 않는다 (docs/design.md > 흔적 지우기).
    if (process.platform === 'darwin') app.dock?.hide()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    startSettings()
    registerGameStore()
    ipcMain.on(IPC.openSettings, openSettingsWindow)
    ipcMain.on(IPC.quit, () => app.quit())

    const settings = getSettings()
    applyPanelSettings(settings)
    setTrayVisible(settings.showTray, trayActions)
    onSettingsChange((s) => {
      applyPanelSettings(s)
      setTrayVisible(s.showTray, trayActions)
    })
    startPanel()
  })

  app.on('before-quit', () => {
    stopPanel()
    flushGames()
  })
  // 설정 창을 닫아도 패널(숨김)은 남는다. 창이 모두 닫히는 일은 종료할 때뿐이다.
  app.on('window-all-closed', () => app.quit())
}
