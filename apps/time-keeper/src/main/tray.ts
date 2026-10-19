import { Menu, Tray, nativeImage } from 'electron'
import icon from '../../resources/icon.png?asset'
import { statusText, TEXT } from '../shared/labels'
import type { TimerService } from './timerService'

interface TrayActions {
  open: () => void
  quit: () => void
}

// 모듈 수준에서 참조를 쥐고 있어야 GC 로 트레이 아이콘이 사라지지 않는다.
export let current: Tray | null = null

/**
 * 트레이(Windows 숨겨진 아이콘 / mac 메뉴바) 아이콘.
 * 툴팁에 현재 분야·경과 시간을 1초마다 갱신한다.
 */
export function createTray(service: TimerService, actions: TrayActions): Tray {
  const image = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  const tray = new Tray(image)
  current = tray

  // TODO(#5): 디지털/아날로그 미니 모드로 열기 항목 추가
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: TEXT.trayOpen, click: actions.open },
      { type: 'separator' },
      { label: TEXT.trayQuit, click: actions.quit }
    ])
  )
  // Windows: 아이콘 클릭으로 창 열기 (mac 은 클릭 시 메뉴가 열린다)
  tray.on('click', actions.open)

  const refresh = (): void =>
    tray.setToolTip(`${TEXT.appName} — ${statusText(service.active, Date.now())}`)
  refresh()
  service.onChange(refresh)
  setInterval(refresh, 1000)

  return tray
}
