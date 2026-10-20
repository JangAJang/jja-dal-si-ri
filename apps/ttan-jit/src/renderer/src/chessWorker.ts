// 컴퓨터 수 계산 Worker — 화면 스레드를 막지 않게 (docs/design.md > 체스).
import { ai } from 'js-chess-engine'
import { ENGINE, fromEngineMove, type ChessLevel } from '../../shared/chess'

export interface EngineRequest {
  id: number
  fen: string
  level: ChessLevel
}

export interface EngineReply {
  id: number
  move: { from: string; to: string } | null
}

self.onmessage = (e: MessageEvent<EngineRequest>): void => {
  const { id, fen, level } = e.data
  const reply: EngineReply = {
    id,
    move: fromEngineMove(ai(fen, { ...ENGINE[level], play: false }).move)
  }
  ;(self as unknown as Worker).postMessage(reply)
}
