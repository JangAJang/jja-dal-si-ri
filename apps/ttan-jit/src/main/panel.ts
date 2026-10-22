import { BrowserWindow, app, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import {
  HIDDEN,
  POLL_MS,
  VISIBLE_POLL_MS,
  contains,
  hotzoneRect,
  nextPanelState,
  panelRect,
  type PanelState,
  type Rect
} from '../shared/hotzone'
import { pickDisplay } from '../shared/displays'
import { IPC } from '../shared/ipc'
import { DEFAULT_SETTINGS, panelSizeOf, type Settings } from '../shared/settings'
import { listDisplays } from './displays'

// 패널 창의 유일한 주인. 숨긴 동안은 창을 실제로 숨기고(hide), 커서 위치를 폴링해 핫존을 감지한다.
// 모서리·지연·크기·화면 공유 숨김은 설정(applyPanelSettings)을 따른다.
let win: BrowserWindow | null = null
let state: PanelState = HIDDEN
let timer: NodeJS.Timeout | null = null
let options: Settings = DEFAULT_SETTINGS
/** 종료 중일 때만 패널 창이 닫힌다 (#51). */
let quitting = false
/** 렌더러가 죽으면 다시 불러오되, 계속 죽으면 멈춘다. */
const RELOAD_LIMIT = 3
const RELOAD_WINDOW_MS = 60_000
let reloads: number[] = []

function createWindow(): BrowserWindow {
  const w = new BrowserWindow({
    width: 360,
    height: 400,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    // 작업표시줄·Alt+Tab 에서 숨김: Windows 는 toolbar(WS_EX_TOOLWINDOW), mac 은 포커스를 뺏지 않는 panel(NSPanel).
    type: process.platform === 'darwin' ? 'panel' : 'toolbar',
    skipTaskbar: true,
    hiddenInMissionControl: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // 숨긴 동안에도 타이머를 늦추지 않는다 — 계산 중이던 컴퓨터 수를 제때 두고, 다시 띄울 때 옛 화면이 보이지 않게.
      // 숨긴 동안 도는 타이머는 없어서(스도쿠 시간은 멈춤) 비용은 거의 없다.
      backgroundThrottling: false
    }
  })

  // 작업표시줄·전체 화면 앱 위에도 뜨도록 가장 높은 층에 둔다.
  w.setAlwaysOnTop(true, 'screen-saver')
  w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  w.setContentProtection(options.contentProtection)
  w.setOpacity(options.opacity)

  w.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    w.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    w.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return w
}

/** 핫존을 둘 모니터의 영역 — 고른 모니터가 없으면(뽑힘) 주 모니터 (#45). */
function targetBounds(): Rect {
  return pickDisplay(listDisplays(), options.displayId)?.bounds ?? screen.getPrimaryDisplay().bounds
}

function show(): void {
  if (!win) return
  // 모니터 배치·해상도가 바뀌었을 수 있으니 띄울 때마다 위치를 다시 잡는다.
  win.setBounds(panelRect(targetBounds(), options.corner, panelSizeOf(options)))
  // 포커스를 뺏지 않는다 — 타이핑 중에 모서리를 스쳐도 입력이 끊기지 않게.
  win.showInactive()
  win.webContents.send(IPC.visibility, true)
}

function hide(): void {
  if (!win || !win.isVisible()) return
  const hadFocus = win.isFocused()
  win.hide()
  win.webContents.send(IPC.visibility, false)
  // mac 에서 패널을 클릭해 앱이 활성화됐다면 이전 앱으로 돌려준다. Windows 는 hide 만으로 돌아간다.
  if (hadFocus && process.platform === 'darwin') app.hide()
}

function setState(next: PanelState): void {
  if (next.visible !== state.visible) {
    if (next.visible) show()
    else hide()
  }
  state = next
}

function cursorInPanel(): boolean {
  return !!win && win.isVisible() && contains(win.getBounds(), screen.getCursorScreenPoint())
}

function tick(): void {
  const cursor = screen.getCursorScreenPoint()
  const display = targetBounds()
  setState(
    nextPanelState(state, {
      now: Date.now(),
      inHotzone: contains(hotzoneRect(display, options.corner), cursor),
      inPanel: cursorInPanel(),
      dwellMs: options.dwellMs
    })
  )
  // 보이는 동안은 한 프레임 간격으로 본다 — 숨김은 즉시여야 한다.
  // 렌더러 mouseleave 는 포커스 없는 toolwindow 에서 오지 않아(Windows 실측) 쓰지 않는다.
  timer = setTimeout(tick, state.visible ? VISIBLE_POLL_MS : POLL_MS)
}

export function startPanel(): void {
  win = createWindow()
  // 사용자가 닫지 못한다(Alt+F4 등) — 패널은 숨기기만 하는 창이고, 보통 유일한 창이라
  // 닫히면 앱 전체가 꺼지던 문제가 있었다 (#51). 종료 중일 때만 닫는다.
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    setState(HIDDEN)
  })
  win.on('closed', () => (win = null))
  // 화면(렌더러)이 죽으면 다시 불러온다 — 빈 창으로 남지 않게. 1분에 3번 넘게 죽으면 멈춘다.
  win.webContents.on('render-process-gone', (_, details) => {
    console.error('[ttan-jit] panel renderer gone:', details.reason)
    if (details.reason === 'clean-exit' || quitting) return
    const now = Date.now()
    reloads = reloads.filter((t) => now - t < RELOAD_WINDOW_MS)
    if (reloads.length >= RELOAD_LIMIT) return
    reloads.push(now)
    win?.webContents.reload()
  })
  tick()
}

export function stopPanel(): void {
  quitting = true
  if (timer) clearTimeout(timer)
  timer = null
}

/** 설정이 바뀌면 부른다. 떠 있던 패널은 숨겨 두고, 다음에 뜰 때 새 모서리·크기로 뜬다. */
export function applyPanelSettings(next: Settings): void {
  options = next
  win?.setContentProtection(options.contentProtection)
  // 창 전체를 반투명하게 — 뒤의 업무 화면이 비친다 (#49). Linux 는 지원하지 않는다.
  win?.setOpacity(options.opacity)
  hidePanel()
}

/** 떠 있던 패널을 숨긴다 (설정·모니터 배치가 바뀌었을 때). 다음에 뜰 때 새 위치로 뜬다. */
export function hidePanel(): void {
  if (state.visible) setState(HIDDEN)
}
