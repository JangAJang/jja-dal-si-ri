import { app, ipcMain } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { EMPTY_GAMES, normalizeGames, type SavedGames } from '../shared/games'
import { IPC } from '../shared/ipc'

// 진행 중인 판 저장 (docs/design.md > 게임 공통 — 앱을 꺼도 이어진다).
// 렌더러가 바뀔 때마다 보내면 1초 모아서 쓰고, 종료할 때 남은 것을 바로 쓴다.
const SAVE_DELAY_MS = 1000

const filePath = (): string => join(app.getPath('userData'), 'ttan-jit-games.json')

let pending: SavedGames | null = null
let timer: NodeJS.Timeout | null = null

function load(): SavedGames {
  try {
    const path = filePath()
    return existsSync(path) ? normalizeGames(JSON.parse(readFileSync(path, 'utf-8'))) : EMPTY_GAMES
  } catch {
    // 깨진 파일이면 새 판으로 시작한다.
    return EMPTY_GAMES
  }
}

/** 임시 파일에 쓴 뒤 rename — 쓰는 도중 꺼져도 기존 파일이 깨지지 않는다. */
function write(data: SavedGames): void {
  const path = filePath()
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(data), 'utf-8')
  renameSync(tmp, path)
}

export function flushGames(): void {
  if (timer) clearTimeout(timer)
  timer = null
  if (pending) write(pending)
  pending = null
}

export function registerGameStore(): void {
  ipcMain.handle(IPC.loadGames, () => load())
  ipcMain.on(IPC.saveGames, (_, data: unknown) => {
    pending = normalizeGames(data)
    if (!timer) timer = setTimeout(flushGames, SAVE_DELAY_MS)
  })
}
