import { Menu, app, ipcMain } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC } from '../shared/ipc'
import { applyPanelSettings, hidePanel, startPanel, stopPanel } from './panel'
import { startDisplays } from './displays'
import { flushGames, registerGameStore } from './gameStore'
import { getSettings, messages, onSettingsChange, startSettings } from './settingsService'
import { openSettingsWindow } from './settingsWindow'
import { updateTray } from './tray'

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
    // 기본 메뉴의 단축키(Ctrl+W 창 닫기 등)를 없앤다 — 메뉴가 보이는 창도 없다 (#51).
    Menu.setApplicationMenu(null)

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    startSettings()
    registerGameStore()
    startDisplays(hidePanel)
    ipcMain.on(IPC.openSettings, openSettingsWindow)
    ipcMain.on(IPC.quit, () => app.quit())

    const settings = getSettings()
    applyPanelSettings(settings)
    updateTray(settings.showTray, messages(), trayActions)
    onSettingsChange((s) => {
      applyPanelSettings(s)
      updateTray(s.showTray, messages(), trayActions)
    })
    startPanel()
  })

  app.on('before-quit', () => {
    stopPanel()
    flushGames()
  })
  // 창이 모두 닫혀도 앱은 계속 돈다 — 종료는 트레이·설정 창의 [종료]로만 (#51).
  // (기본 동작은 Windows 에서 앱 종료라 핸들러를 둬서 막는다.)
  app.on('window-all-closed', () => {})
}
