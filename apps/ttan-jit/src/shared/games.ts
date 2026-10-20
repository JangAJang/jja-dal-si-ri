// 게임 저장 파일 형식 (userData/ttan-jit-games.json). 앱을 꺼도 하던 판을 이어서 한다.
import { normalizeSudoku, type SudokuGame } from './sudokuGame'

export type GameKind = 'chess' | 'sudoku'

export interface SavedGames {
  version: 1
  /** 패널을 띄우면 이 게임이 나온다. */
  lastGame: GameKind
  sudoku: SudokuGame | null
}

export const EMPTY_GAMES: SavedGames = { version: 1, lastGame: 'sudoku', sudoku: null }

export function normalizeGames(raw: unknown): SavedGames {
  if (!raw || typeof raw !== 'object') return EMPTY_GAMES
  const g = raw as Partial<SavedGames>
  return {
    version: 1,
    lastGame: g.lastGame === 'chess' || g.lastGame === 'sudoku' ? g.lastGame : EMPTY_GAMES.lastGame,
    sudoku: normalizeSudoku(g.sudoku)
  }
}
