import { BrowserWindow, ipcMain, powerMonitor } from 'electron'
import { randomUUID } from 'crypto'
import * as timer from '../shared/timer'
import { IPC } from '../shared/ipc'
import { load, save, type StoreData } from './store'

const HEARTBEAT_MS = 30_000

/**
 * 타이머 상태의 유일한 소유자. 렌더러(기본/미니 창 여럿)는 IPC 로 요청하고
 * IPC.changed 브로드캐스트로 최신 상태를 받는다.
 */
export class TimerService {
  private data: StoreData
  private heartbeatTimer: NodeJS.Timeout | null = null

  constructor() {
    const loaded = load()
    this.data = { ...loaded, ...timer.recover(loaded) }
    save(this.data)
  }

  register(): void {
    ipcMain.handle(IPC.getState, () => this.snapshot())
    ipcMain.handle(IPC.start, (_e, category: timer.Category) => {
      if (!timer.CATEGORIES.includes(category)) throw new Error(`unknown category: ${category}`)
      this.apply(timer.start(this.data, category, Date.now(), randomUUID()))
    })
    ipcMain.handle(IPC.stop, () => this.apply(timer.stop(this.data, Date.now())))

    // 절전에 들어가면 그 시각으로 마감한다 (깨어나도 자동 재시작하지 않음).
    powerMonitor.on('suspend', () => this.stopNow())

    this.heartbeatTimer = setInterval(() => {
      if (this.data.active) {
        this.data = { ...this.data, ...timer.heartbeat(this.data, Date.now()) }
        save(this.data)
      }
    }, HEARTBEAT_MS)
  }

  /** 앱 종료 직전 호출 — 진행 중인 기록을 지금 시각으로 마감한다. */
  shutdown(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.stopNow()
  }

  private stopNow(): void {
    this.apply(timer.stop(this.data, Date.now()))
  }

  private snapshot(): timer.TimerState {
    return { active: this.data.active, sessions: this.data.sessions }
  }

  private apply(next: timer.TimerState): void {
    if (next.active === this.data.active && next.sessions === this.data.sessions) return
    this.data = { ...this.data, ...next }
    save(this.data)
    const state = this.snapshot()
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.changed, state)
  }
}
