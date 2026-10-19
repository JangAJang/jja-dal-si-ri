import { Menu, Tray, nativeImage, shell } from 'electron'
import icon from '../../resources/icon.png?asset'
import { statusText, type Messages } from '../shared/labels'
import type { ViewMode } from '../shared/view'
import type { SettingsService } from './settingsService'
import type { TimerService } from './timerService'
import type { UpdateService } from './updateService'

interface TrayActions {
  open: (mode: ViewMode) => void
  quit: () => void
}

// 모듈 수준에서 참조를 쥐고 있어야 GC 로 트레이 아이콘이 사라지지 않는다.
export let current: Tray | null = null

/**
 * 트레이(Windows 숨겨진 아이콘 / mac 메뉴바) 아이콘.
 * 툴팁에 현재 분야·경과 시간을 1초마다 갱신하고, 언어가 바뀌면 메뉴를 다시 만든다.
 */
export function createTray(
  service: TimerService,
  settings: SettingsService,
  updates: UpdateService,
  actions: TrayActions
): Tray {
  const image = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  const tray = new Tray(image)
  current = tray

  const buildMenu = (t: Messages): void =>
    tray.setContextMenu(
      Menu.buildFromTemplate([
        ...(updates.visible
          ? [
              {
                label: t.trayUpdate(updates.visible.version),
                click: () => void shell.openExternal(updates.visible?.url ?? '')
              },
              { type: 'separator' as const }
            ]
          : []),
        { label: t.trayOpen, click: () => actions.open('main') },
        { label: t.toDigital, click: () => actions.open('digital') },
        { label: t.toAnalog, click: () => actions.open('analog') },
        { type: 'separator' },
        { label: t.trayQuit, click: actions.quit }
      ])
    )
  // Windows: 아이콘 클릭으로 창 열기 (mac 은 클릭 시 메뉴가 열린다)
  tray.on('click', () => actions.open('main'))

  const refresh = (): void => {
    const t = settings.messages
    tray.setToolTip(`${t.appName} — ${statusText(t, service.active, Date.now())}`)
  }
  buildMenu(settings.messages)
  refresh()
  service.onChange(refresh)
  settings.onChange(() => {
    buildMenu(settings.messages)
    refresh()
  })
  updates.onChange(() => buildMenu(settings.messages))
  setInterval(refresh, 1000)

  return tray
}
