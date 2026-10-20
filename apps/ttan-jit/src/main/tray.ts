import { Menu, Tray, nativeImage } from 'electron'
import trayIcon from '../../resources/tray.png?asset'
import trayTemplate from '../../resources/trayTemplate.png?asset'
import { ko as t } from '../shared/labels'

interface TrayActions {
  openSettings: () => void
  quit: () => void
}

// 모듈 수준에서 참조를 쥐고 있어야 GC 로 트레이 아이콘이 사라지지 않는다.
let tray: Tray | null = null

/**
 * 트레이(Windows 알림 영역 / mac 메뉴 막대) 아이콘. 설정에서 끌 수 있다 (docs/design.md > 흔적 지우기).
 * 아이콘·툴팁은 게임처럼 보이지 않게 점 격자와 앱 폴더 이름만 쓴다.
 */
export function setTrayVisible(visible: boolean, actions: TrayActions): void {
  if (!visible) {
    tray?.destroy()
    tray = null
    return
  }
  if (tray) return
  // mac 은 템플릿 이미지(@2x 는 같은 폴더에서 자동으로 고른다), Windows 는 회색 아이콘.
  const image =
    process.platform === 'darwin'
      ? nativeImage.createFromPath(trayTemplate)
      : nativeImage.createFromPath(trayIcon).resize({ width: 16, height: 16 })
  if (process.platform === 'darwin') image.setTemplateImage(true)
  tray = new Tray(image)
  tray.setToolTip('ttan-jit')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: t.tray.settings, click: actions.openSettings },
      { type: 'separator' },
      { label: t.tray.quit, click: actions.quit }
    ])
  )
  // Windows: 아이콘 클릭으로 설정 열기 (mac 은 클릭 시 메뉴가 열린다)
  tray.on('click', actions.openSettings)
}
