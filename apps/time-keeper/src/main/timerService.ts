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
  private listeners: Array<(state: timer.TimerState) => void> = []
  /** 다른 기기에서 동기화로 받은 끝난 기록 (#7). 읽기 전용 — 저장·업로드하지 않는다. */
  private remoteSessions: timer.Session[] = []

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

  /** 앱 종료 직전 호출 — 진행 중인 기록을 지금 시각으로 마감한다. 여러 번 불려도 안전하다. */
  shutdown(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
    this.stopNow()
  }

  get active(): timer.ActiveSession | null {
    return this.data.active
  }

  get deviceId(): string {
    return this.data.deviceId
  }

  /** 이 기기에서 끝난 기록 (동기화로 올리는 것) */
  get ownSessions(): timer.Session[] {
    return this.data.sessions
  }

  /**
   * 동기화로 받은 다른 기기 기록을 바꾼다. 창에는 알리지만 onChange 구독자에게는 알리지 않는다 —
   * onChange 는 "이 기기 기록이 바뀜"이라 동기화를 다시 부르기 때문이다.
   */
  setRemoteSessions(sessions: timer.Session[]): void {
    this.remoteSessions = sessions
    this.broadcast()
  }

  /** main 프로세스 안의 구독자(트레이·동기화)용, 이 기기 기록이 바뀔 때. 렌더러는 IPC.changed 를 받는다. */
  onChange(listener: (state: timer.TimerState) => void): void {
    this.listeners.push(listener)
  }

  /** 진행 중인 기록이 sessionId 이면 endedAt 으로 끝낸다 (다른 기기가 이어받았을 때 #7). 끝냈으면 true */
  stopAt(sessionId: string, endedAt: number): boolean {
    if (this.data.active?.id !== sessionId) return false
    this.apply(timer.stop(this.data, endedAt))
    return true
  }

  private stopNow(): void {
    this.apply(timer.stop(this.data, Date.now()))
  }

  /** 창에 보내는 상태: 이 기기 기록 + 다른 기기 기록(통계용) */
  private snapshot(): timer.TimerState {
    const sessions = this.remoteSessions.length
      ? [...this.data.sessions, ...this.remoteSessions]
      : this.data.sessions
    return { active: this.data.active, sessions }
  }

  private broadcast(): void {
    const state = this.snapshot()
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.changed, state)
  }

  private apply(next: timer.TimerState): void {
    if (next.active === this.data.active && next.sessions === this.data.sessions) return
    this.data = { ...this.data, ...next }
    save(this.data)
    this.broadcast()
    const state = this.snapshot()
    for (const listener of this.listeners) listener(state)
  }
}
