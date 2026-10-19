import { app } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { TimerState } from '../shared/timer'

/** 로컬 저장 파일 형식. 구글 드라이브 동기화(후속)는 이 파일을 기기별 파일로 올린다. */
export interface StoreData extends TimerState {
  version: 1
  deviceId: string
}

const filePath = (): string => join(app.getPath('userData'), 'time-keeper-data.json')

export function load(): StoreData {
  const path = filePath()
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8')) as StoreData
  }
  return { version: 1, deviceId: randomUUID(), active: null, sessions: [] }
}

/** 임시 파일에 쓴 뒤 rename — 쓰는 도중 꺼져도 기존 파일이 깨지지 않는다. */
export function save(data: StoreData): void {
  const path = filePath()
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(data), 'utf-8')
  renameSync(tmp, path)
}
