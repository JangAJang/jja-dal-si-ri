import { BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC } from '../shared/ipc'
import type { ViewMode } from '../shared/view'

/**
 * 창 관리. 기본 / 디지털 미니 / 아날로그 미니 창을 하나씩만 만들어 두고(숨김·표시),
 * 화면에는 항상 하나만 보이게 한다.
 */

interface WindowSpec {
  width: number
  height: number
  mini: boolean
}

const SPECS: Record<ViewMode, WindowSpec> = {
  main: { width: 360, height: 500, mini: false },
  digital: { width: 260, height: 118, mini: true },
  analog: { width: 220, height: 262, mini: true }
}

const windows = new Map<ViewMode, BrowserWindow>()
/** true 가 되면 창 닫기를 더 이상 막지 않는다 (실제 종료 진행 중). */
let quitting = false
let onSessionEnd: () => void = () => {}
let titleOf: () => string = () => ''

export function markQuitting(): void {
  quitting = true
}

export function isQuitting(): boolean {
  return quitting
}

export function initWindows(options: { onSessionEnd: () => void; title: () => string }): void {
  onSessionEnd = options.onSessionEnd
  titleOf = options.title
  registerIpc()
}

function createWindow(mode: ViewMode): BrowserWindow {
  const spec = SPECS[mode]
  const win = new BrowserWindow({
    width: spec.width,
    height: spec.height,
    show: false,
    resizable: false,
    maximizable: false,
    title: titleOf(),
    autoHideMenuBar: true,
    ...(spec.mini
      ? {
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          minimizable: false,
          hasShadow: false,
          ...miniPosition(spec)
        }
      : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // mac 에서 전체화면 앱 위에도 뜨도록
  if (spec.mini) win.setAlwaysOnTop(true, 'floating')

  // X 버튼(또는 OS 의 닫기)은 숨기기만 한다. 타이머는 계속 돈다.
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    win.hide()
  })

  // Windows 로그오프·종료 시에는 before-quit 이 오지 않는다 — 여기서 기록을 마감한다.
  win.on('session-end', () => {
    quitting = true
    onSessionEnd()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${mode}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: mode })
  }
  return win
}

/** 미니 창 첫 위치: 주 모니터 작업 영역의 오른쪽 아래. */
function miniPosition(spec: WindowSpec): { x: number; y: number } {
  const area = screen.getPrimaryDisplay().workArea
  const margin = 24
  return {
    x: area.x + area.width - spec.width - margin,
    y: area.y + area.height - spec.height - margin
  }
}

function getOrCreate(mode: ViewMode): BrowserWindow {
  const existing = windows.get(mode)
  if (existing && !existing.isDestroyed()) return existing
  const win = createWindow(mode)
  windows.set(mode, win)
  return win
}

/** 해당 모드 창을 띄우고 나머지는 숨긴다. */
export function openView(mode: ViewMode): void {
  const target = getOrCreate(mode)
  for (const [m, win] of windows) {
    if (m !== mode && !win.isDestroyed()) win.hide()
  }
  const show = (): void => {
    if (target.isMinimized()) target.restore()
    target.show()
    target.focus()
  }
  // 막 만든 창은 로드가 끝난 뒤에 보여야 빈 화면이 깜빡이지 않는다
  if (target.webContents.isLoading()) target.once('ready-to-show', show)
  else show()
}

/** 언어가 바뀌면 이미 만든 창 제목도 바꾼다. */
export function setWindowTitles(title: string): void {
  for (const win of windows.values()) if (!win.isDestroyed()) win.setTitle(title)
}

/** 대화상자의 부모로 쓸, 지금 보이는 창. */
export function visibleWindow(): BrowserWindow | undefined {
  for (const win of windows.values()) {
    if (!win.isDestroyed() && win.isVisible()) return win
  }
  return undefined
}

let dragTimer: NodeJS.Timeout | null = null

function stopDrag(): void {
  if (dragTimer) clearInterval(dragTimer)
  dragTimer = null
}

function registerIpc(): void {
  ipcMain.handle(IPC.openView, (_e, mode: ViewMode) => {
    if (!(mode in SPECS)) throw new Error(`unknown view: ${mode}`)
    openView(mode)
  })

  ipcMain.handle(IPC.getAlwaysOnTop, (e) => {
    return BrowserWindow.fromWebContents(e.sender)?.isAlwaysOnTop() ?? false
  })
  ipcMain.handle(IPC.setAlwaysOnTop, (e, value: boolean) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.setAlwaysOnTop(Boolean(value))
    return win?.isAlwaysOnTop() ?? false
  })

  // 미니 창 드래그: 커서 위치를 따라 창을 옮긴다. CSS drag 영역을 쓰지 않는 이유는
  // Windows 에서 drag 영역이 더블클릭을 삼켜 "더블클릭 → 기본 모드"가 동작하지 않기 때문이다.
  ipcMain.on(IPC.dragStart, (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    stopDrag()
    const from = screen.getCursorScreenPoint()
    const [wx, wy] = win.getPosition()
    dragTimer = setInterval(() => {
      if (win.isDestroyed()) return stopDrag()
      const p = screen.getCursorScreenPoint()
      win.setPosition(wx + p.x - from.x, wy + p.y - from.y)
    }, 16)
  })
  ipcMain.on(IPC.dragEnd, () => stopDrag())
}
