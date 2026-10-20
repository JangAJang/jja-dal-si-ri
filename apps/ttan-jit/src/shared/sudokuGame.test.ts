import { describe, expect, it } from 'vitest'
import { seededRng } from './sudoku'
import {
  HISTORY_LIMIT,
  addElapsed,
  erase,
  formatElapsed,
  isGiven,
  isSolved,
  isWrong,
  newSudoku,
  normalizeSudoku,
  setValue,
  toggleNote,
  undo,
  type SudokuGame
} from './sudokuGame'
import { EMPTY_GAMES, normalizeGames } from './games'

const game = (): SudokuGame => newSudoku('easy', seededRng(42))
const firstEmpty = (g: SudokuGame): number => g.puzzle.findIndex((v) => v === 0)
const wrongDigit = (g: SudokuGame, i: number): number => (g.solution[i] % 9) + 1

describe('숫자 넣기', () => {
  it('주어진 칸은 바꿀 수 없다', () => {
    const g = game()
    const given = g.puzzle.findIndex((v) => v !== 0)
    expect(isGiven(g, given)).toBe(true)
    expect(setValue(g, given, 1)).toBe(g)
    expect(erase(g, given)).toBe(g)
  })

  it('넣고, 같은 숫자를 다시 넣으면 지운다', () => {
    const g = game()
    const i = firstEmpty(g)
    const a = setValue(g, i, 3)
    expect(a.values[i]).toBe(3)
    expect(setValue(a, i, 3).values[i]).toBe(0)
  })

  it('틀린 칸 표시', () => {
    const g = game()
    const i = firstEmpty(g)
    expect(isWrong(setValue(g, i, wrongDigit(g, i)), i)).toBe(true)
    expect(isWrong(setValue(g, i, g.solution[i]), i)).toBe(false)
  })

  it('넣은 숫자는 이웃 칸 메모에서 빠진다', () => {
    let g = game()
    const empties = g.puzzle.flatMap((v, i) => (v === 0 ? [i] : []))
    const [a] = empties
    // a 와 같은 행의 다른 빈칸
    const b = empties.find((j) => j !== a && Math.floor(j / 9) === Math.floor(a / 9))!
    g = toggleNote(g, b, 5)
    g = toggleNote(g, b, 6)
    g = setValue(g, a, 5)
    expect(g.notes[b]).toBe(1 << 5) // 6만 남음
  })
})

describe('메모', () => {
  it('켜고 끄기, 숫자가 든 칸에는 안 됨', () => {
    let g = game()
    const i = firstEmpty(g)
    g = toggleNote(g, i, 2)
    expect(g.notes[i]).toBe(1 << 1)
    expect(toggleNote(g, i, 2).notes[i]).toBe(0)
    const filled = setValue(g, i, 4)
    expect(filled.notes[i]).toBe(0)
    expect(toggleNote(filled, i, 7)).toBe(filled)
  })
})

describe('되돌리기', () => {
  it('한 단계씩 되돌린다', () => {
    const g0 = game()
    const i = firstEmpty(g0)
    const g1 = setValue(g0, i, 1)
    const g2 = setValue(g1, i, 2)
    expect(undo(g2).values).toEqual(g1.values)
    expect(undo(undo(g2)).values).toEqual(g0.values)
    expect(undo(g0)).toBe(g0)
  })

  it(`기록은 최대 ${HISTORY_LIMIT}개`, () => {
    let g = game()
    const i = firstEmpty(g)
    for (let k = 0; k < HISTORY_LIMIT + 20; k++) g = setValue(g, i, (k % 9) + 1)
    expect(g.history).toHaveLength(HISTORY_LIMIT)
  })
})

describe('완성', () => {
  const solveAll = (g: SudokuGame): SudokuGame =>
    g.puzzle.reduce((acc, v, i) => (v === 0 ? setValue(acc, i, g.solution[i]) : acc), g)

  it('모두 맞게 채우면 완성, 이후 입력·시간은 멈춘다', () => {
    const done = solveAll(game())
    expect(isSolved(done)).toBe(true)
    const i = firstEmpty(done)
    expect(setValue(done, i, wrongDigit(done, i))).toBe(done)
    expect(undo(done)).toBe(done)
    expect(addElapsed(done, 1000)).toBe(done)
  })
})

describe('풀이 시간', () => {
  it('더하기와 표시', () => {
    expect(addElapsed(game(), 1500).elapsedMs).toBe(1500)
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(65_000)).toBe('01:05')
    expect(formatElapsed(3_725_000)).toBe('1:02:05')
  })
})

describe('저장 형식 검사', () => {
  it('정상 판은 그대로 읽힌다', () => {
    const g = setValue(game(), firstEmpty(game()), 3)
    expect(normalizeSudoku(JSON.parse(JSON.stringify(g)))).toEqual(g)
  })

  it('깨진 값은 null', () => {
    const g = game()
    expect(normalizeSudoku(null)).toBeNull()
    expect(normalizeSudoku({ ...g, version: 2 })).toBeNull()
    expect(normalizeSudoku({ ...g, values: g.values.slice(1) })).toBeNull()
    const given = g.puzzle.findIndex((v) => v !== 0)
    const tampered = g.values.slice()
    tampered[given] = (tampered[given] % 9) + 1
    expect(normalizeSudoku({ ...g, values: tampered })).toBeNull()
  })

  it('게임 파일: 모르는 값은 기본값으로', () => {
    expect(normalizeGames(undefined)).toEqual(EMPTY_GAMES)
    expect(
      normalizeGames({ chess: { version: 1, level: 'easy', player: 'w', moves: ['e2e4'] } }).chess
        ?.moves
    ).toEqual(['e2e4'])
    expect(normalizeGames({ lastGame: 'tetris', sudoku: 'x' })).toEqual(EMPTY_GAMES)
    expect(normalizeGames({ lastGame: 'chess' }).lastGame).toBe('chess')
  })
})
