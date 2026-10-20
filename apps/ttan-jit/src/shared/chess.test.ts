import { describe, expect, it } from 'vitest'
import { ai } from 'js-chess-engine'
import {
  ENGINE,
  applyMove,
  fromEngineMove,
  newChess,
  normalizeChess,
  replay,
  statusOf,
  targets,
  type ChessGame
} from './chess'

const play = (g: ChessGame, ...moves: string[]): ChessGame =>
  moves.reduce((acc, m) => applyMove(acc, m.slice(0, 2), m.slice(2, 4))!, g)

describe('새 판', () => {
  it('색을 고르거나 무작위로', () => {
    expect(newChess('easy', 'w').player).toBe('w')
    expect(newChess('easy', 'b').player).toBe('b')
    expect(newChess('easy', 'random', () => 0.1).player).toBe('w')
    expect(newChess('easy', 'random', () => 0.9).player).toBe('b')
  })
})

describe('수 두기', () => {
  it('규칙대로 두고 못 두는 수는 null', () => {
    const g = newChess('medium', 'w')
    const a = applyMove(g, 'e2', 'e4')!
    expect(a.moves).toEqual(['e2e4'])
    expect(applyMove(g, 'e2', 'e5')).toBeNull() // 폰 세 칸
    expect(applyMove(a, 'e4', 'e5')).toBeNull() // 흑 차례에 백 기물
    expect(g.moves).toEqual([]) // 원래 판은 그대로
  })

  it('갈 수 있는 칸', () => {
    const c = replay([])!
    expect(targets(c, 'g1').sort()).toEqual(['f3', 'h3'])
    expect(targets(c, 'e1')).toEqual([])
  })

  it('끝 줄에 닿은 폰은 퀸으로 승격', () => {
    // 백 폰을 a7 까지 밀고, b8 을 잡으며 승격
    let g = newChess('easy', 'w')
    g = play(g, 'a2a4', 'h7h6', 'a4a5', 'h6h5', 'a5a6', 'h5h4', 'a6b7', 'h4h3', 'b7a8')
    expect(g.moves.at(-1)).toBe('b7a8q')
    expect(replay(g.moves)!.get('a8')).toEqual({ type: 'q', color: 'w' })
  })
})

describe('판정', () => {
  it('바보 메이트 — 흑 승', () => {
    const g = play(newChess('easy', 'w'), 'f2f3', 'e7e5', 'g2g4', 'd8h4')
    const c = replay(g.moves)!
    expect(statusOf(c)).toEqual({ kind: 'checkmate', winner: 'b' })
    expect(applyMove(g, 'a2', 'a3')).toBeNull() // 끝난 판에는 못 둔다
  })

  it('체크 표시', () => {
    const g = play(newChess('easy', 'w'), 'e2e4', 'f7f6', 'd1h5')
    expect(statusOf(replay(g.moves)!)).toEqual({ kind: 'playing', check: true })
  })

  it('같은 위치 세 번 — 무승부', () => {
    const shuffle = ['g1f3', 'g8f6', 'f3g1', 'f6g8']
    const g = play(newChess('easy', 'w'), ...shuffle, ...shuffle)
    expect(statusOf(replay(g.moves)!)).toEqual({ kind: 'draw', reason: 'repetition' })
  })
})

describe('컴퓨터 수', () => {
  it('엔진 수를 칸 이름으로 바꾼다', () => {
    expect(fromEngineMove({ E2: 'E4' })).toEqual({ from: 'e2', to: 'e4' })
    expect(fromEngineMove({})).toBeNull()
  })

  it('엔진이 고른 수는 chess.js 에서도 둘 수 있다', () => {
    let g = newChess('easy', 'b')
    for (let k = 0; k < 6; k++) {
      const c = replay(g.moves)!
      const m = fromEngineMove(ai(c.fen(), { ...ENGINE.easy, play: false }).move)!
      const next = applyMove(g, m.from, m.to)
      expect(next).not.toBeNull()
      g = next!
    }
    expect(g.moves).toHaveLength(6)
  })
})

describe('저장 형식 검사', () => {
  it('정상 판은 그대로', () => {
    const g = play(newChess('hard', 'b'), 'e2e4', 'e7e5')
    expect(normalizeChess(JSON.parse(JSON.stringify(g)))).toEqual(g)
  })

  it('깨지거나 둘 수 없는 수 목록은 null', () => {
    const g = newChess('hard', 'w')
    expect(normalizeChess(null)).toBeNull()
    expect(normalizeChess({ ...g, player: 'x' })).toBeNull()
    expect(normalizeChess({ ...g, level: 'god' })).toBeNull()
    expect(normalizeChess({ ...g, moves: ['e2e5'] })).toBeNull()
    expect(normalizeChess({ ...g, moves: ['hello'] })).toBeNull()
  })
})
