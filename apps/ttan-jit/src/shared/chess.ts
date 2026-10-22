// 체스 한 판의 상태와 규칙 (docs/design.md > 체스). 규칙·판정은 chess.js(BSD), 컴퓨터 수는 js-chess-engine(MIT, Worker).
// 저장은 시작 위치부터의 수 목록(UCI: e2e4, e7e8q)만 하고, 판은 그때그때 다시 둬서 만든다.
import { Chess, type Square } from 'chess.js'

export type ChessLevel = 'easy' | 'medium' | 'hard' | 'veryHard'
export type Side = 'w' | 'b'
export type SideChoice = Side | 'random'

export const CHESS_LEVELS: ChessLevel[] = ['easy', 'medium', 'hard', 'veryHard']

/**
 * 난이도 → js-chess-engine 설정. randomness 는 최선 수와 이 센티폰 안쪽인 수 중에서 고르게 해 매번 같은 판이 되지 않게 한다.
 * 쉬움은 한 수 앞만 보고 폭을 크게 줘서 실수를 자주 한다 (#47 — "너무 어렵다"는 피드백으로 추가, 기존 셋은 한 칸씩 위로).
 */
export const ENGINE: Record<ChessLevel, { level: number; randomness: number }> = {
  easy: { level: 1, randomness: 200 },
  medium: { level: 2, randomness: 60 },
  hard: { level: 3, randomness: 20 },
  veryHard: { level: 4, randomness: 0 }
}

/** 저장 형식 1(난이도 3단계) → 2: 같은 엔진 세기의 새 이름으로 옮긴다. */
const V1_LEVEL: Record<string, ChessLevel> = { easy: 'medium', medium: 'hard', hard: 'veryHard' }

export interface ChessGame {
  version: 2
  level: ChessLevel
  /** 내 색. */
  player: Side
  /** 시작 위치부터 둔 수 (UCI). */
  moves: string[]
}

export type ChessStatus =
  | { kind: 'playing'; check: boolean }
  | { kind: 'checkmate'; winner: Side }
  | { kind: 'draw'; reason: 'stalemate' | 'repetition' | 'insufficient' | 'fifty' }

export function newChess(
  level: ChessLevel,
  side: SideChoice,
  rng: () => number = Math.random
): ChessGame {
  const player = side === 'random' ? (rng() < 0.5 ? 'w' : 'b') : side
  return { version: 2, level, player, moves: [] }
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

/** 수 목록을 다시 둬서 판을 만든다. 둘 수 없는 수가 있으면 null. */
export function replay(moves: string[]): Chess | null {
  const c = new Chess()
  try {
    for (const m of moves) c.move(parseUci(m))
  } catch {
    return null
  }
  return c
}

/** from 칸 기물이 갈 수 있는 칸들. */
export function targets(c: Chess, from: string): string[] {
  return c.moves({ square: from as Square, verbose: true }).map((m) => m.to)
}

/**
 * 수 두기. 둘 수 없으면 null. 폰이 끝 줄에 닿으면 퀸으로 승격한다(승격 기물 고르기는 두지 않음).
 * 내 수와 컴퓨터 수 모두 이 함수로 둔다.
 */
export function applyMove(g: ChessGame, from: string, to: string): ChessGame | null {
  const c = replay(g.moves)
  if (!c || c.isGameOver()) return null
  const legal = c.moves({ square: from as Square, verbose: true }).filter((m) => m.to === to)
  if (legal.length === 0) return null
  const promotion = legal.some((m) => m.promotion) ? 'q' : ''
  return { ...g, moves: [...g.moves, `${from}${to}${promotion}`] }
}

export function statusOf(c: Chess): ChessStatus {
  if (c.isCheckmate()) return { kind: 'checkmate', winner: c.turn() === 'w' ? 'b' : 'w' }
  if (c.isStalemate()) return { kind: 'draw', reason: 'stalemate' }
  if (c.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient' }
  if (c.isThreefoldRepetition()) return { kind: 'draw', reason: 'repetition' }
  if (c.isDrawByFiftyMoves()) return { kind: 'draw', reason: 'fifty' }
  return { kind: 'playing', check: c.inCheck() }
}

/**
 * 무르기 — 내 마지막 수까지 되돌려 다시 내 차례로 만든다.
 * 내 차례면 컴퓨터 응수와 내 수 두 수를, 컴퓨터 차례(생각 중이거나 내 수로 판이 끝남)면 내 수 하나를 무른다.
 * 무를 내 수가 없으면(시작, 흑일 때 컴퓨터 첫 수만 있음) 그대로 돌려준다.
 */
export function undoMove(g: ChessGame): ChessGame {
  const n = target(g)
  return n === null ? g : { ...g, moves: g.moves.slice(0, n) }
}

export function canUndo(g: ChessGame): boolean {
  return target(g) !== null
}

/** 무른 뒤의 수 개수. 내 차례인 위치는 백이면 짝수, 흑이면 홀수 개 둔 뒤다. */
function target(g: ChessGame): number | null {
  const len = g.moves.length
  const myTurnNow = (len % 2 === 0) === (g.player === 'w')
  const n = len - (myTurnNow ? 2 : 1)
  const first = g.player === 'w' ? 0 : 1
  return n >= first ? n : null
}

/** js-chess-engine 의 수({"E2": "E4"})를 칸 이름 쌍으로. */
export function fromEngineMove(move: Record<string, string>): { from: string; to: string } | null {
  const [entry] = Object.entries(move)
  return entry ? { from: entry[0].toLowerCase(), to: entry[1].toLowerCase() } : null
}

/** 저장 파일에서 읽은 값을 검사한다. 수 목록을 실제로 다시 둬 보고, 안 되면 null (새 판). */
export function normalizeChess(raw: unknown): ChessGame | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Omit<Partial<ChessGame>, 'version' | 'level'> & {
    version?: number
    level?: string
  }
  const level =
    g.version === 2
      ? CHESS_LEVELS.find((l) => l === g.level)
      : g.version === 1
        ? V1_LEVEL[g.level ?? '']
        : undefined
  if (!level) return null
  if (g.player !== 'w' && g.player !== 'b') return null
  if (
    !Array.isArray(g.moves) ||
    !g.moves.every((m) => typeof m === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))
  )
    return null
  if (!replay(g.moves)) return null
  return { version: 2, level, player: g.player, moves: g.moves }
}
