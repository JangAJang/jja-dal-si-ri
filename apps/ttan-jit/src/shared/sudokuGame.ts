// 스도쿠 한 판의 상태와 조작 (숫자·메모·지우기·되돌리기·풀이 시간). 모든 함수는 새 객체를 돌려준다.
import { DIFFICULTIES, PEERS, bit, generate, type Difficulty, type Grid, type Rng } from './sudoku'

interface Snapshot {
  values: Grid
  notes: number[]
}

export interface SudokuGame {
  version: 1
  difficulty: Difficulty
  /** 처음 주어진 칸 (0 = 빈칸). 바꿀 수 없다. */
  puzzle: Grid
  solution: Grid
  /** 지금 판 (주어진 칸 포함). */
  values: Grid
  /** 칸별 메모 (9비트 마스크). */
  notes: number[]
  history: Snapshot[]
  /** 패널이 보이는 동안만 더한 풀이 시간. */
  elapsedMs: number
}

export const HISTORY_LIMIT = 100

export function newSudoku(difficulty: Difficulty, rng?: Rng): SudokuGame {
  const { puzzle, solution } = generate(difficulty, rng)
  return {
    version: 1,
    difficulty,
    puzzle,
    solution,
    values: puzzle.slice(),
    notes: Array(81).fill(0),
    history: [],
    elapsedMs: 0
  }
}

export const isGiven = (g: SudokuGame, i: number): boolean => g.puzzle[i] !== 0
export const isWrong = (g: SudokuGame, i: number): boolean =>
  g.values[i] !== 0 && g.values[i] !== g.solution[i]
export const isSolved = (g: SudokuGame): boolean => g.values.every((v, i) => v === g.solution[i])

function commit(g: SudokuGame, values: Grid, notes: number[]): SudokuGame {
  const history = [...g.history, { values: g.values, notes: g.notes }].slice(-HISTORY_LIMIT)
  return { ...g, values, notes, history }
}

/** 숫자 넣기. 같은 숫자를 다시 넣으면 지운다. 넣은 숫자는 같은 행·열·상자의 메모에서 빠진다. */
export function setValue(g: SudokuGame, i: number, d: number): SudokuGame {
  if (isGiven(g, i) || isSolved(g)) return g
  const values = g.values.slice()
  const notes = g.notes.slice()
  if (values[i] === d) {
    values[i] = 0
  } else {
    values[i] = d
    notes[i] = 0
    for (const p of PEERS[i]) notes[p] &= ~bit(d)
  }
  return commit(g, values, notes)
}

/** 메모 켜고 끄기. 숫자가 들어간 칸에는 메모하지 않는다. */
export function toggleNote(g: SudokuGame, i: number, d: number): SudokuGame {
  if (isGiven(g, i) || g.values[i] !== 0 || isSolved(g)) return g
  const notes = g.notes.slice()
  notes[i] ^= bit(d)
  return commit(g, g.values, notes)
}

export function erase(g: SudokuGame, i: number): SudokuGame {
  if (isGiven(g, i) || isSolved(g) || (g.values[i] === 0 && g.notes[i] === 0)) return g
  const values = g.values.slice()
  const notes = g.notes.slice()
  values[i] = 0
  notes[i] = 0
  return commit(g, values, notes)
}

export function undo(g: SudokuGame): SudokuGame {
  const last = g.history[g.history.length - 1]
  if (!last || isSolved(g)) return g
  return { ...g, values: last.values, notes: last.notes, history: g.history.slice(0, -1) }
}

export function addElapsed(g: SudokuGame, ms: number): SudokuGame {
  return ms > 0 && !isSolved(g) ? { ...g, elapsedMs: g.elapsedMs + ms } : g
}

const isGrid = (v: unknown, max: number): v is number[] =>
  Array.isArray(v) && v.length === 81 && v.every((n) => Number.isInteger(n) && n >= 0 && n <= max)

/** 저장 파일에서 읽은 값을 검사한다. 형식이 맞지 않으면 null (새 판으로 시작). */
export function normalizeSudoku(raw: unknown): SudokuGame | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Partial<SudokuGame>
  if (g.version !== 1 || !DIFFICULTIES.includes(g.difficulty as Difficulty)) return null
  if (!isGrid(g.puzzle, 9) || !isGrid(g.solution, 9) || !isGrid(g.values, 9)) return null
  if (!isGrid(g.notes, 0x1ff)) return null
  if (g.puzzle.some((v, i) => v !== 0 && (v !== g.solution![i] || v !== g.values![i]))) return null
  const history = Array.isArray(g.history)
    ? g.history.filter((s) => s && isGrid(s.values, 9) && isGrid(s.notes, 0x1ff))
    : []
  return {
    version: 1,
    difficulty: g.difficulty as Difficulty,
    puzzle: g.puzzle,
    solution: g.solution,
    values: g.values,
    notes: g.notes,
    history: history.slice(-HISTORY_LIMIT),
    elapsedMs: typeof g.elapsedMs === 'number' && g.elapsedMs > 0 ? g.elapsedMs : 0
  }
}

/** 풀이 시간 표시 (분:초, 한 시간 넘으면 시:분:초). */
export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const two = (n: number): string => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  return h > 0
    ? `${h}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`
    : `${two(Math.floor(s / 60))}:${two(s % 60)}`
}
