import { describe, expect, it } from 'vitest'
import {
  PEERS,
  TARGET_CLUES,
  UNITS,
  countSolutions,
  generate,
  randomSolution,
  seededRng,
  solvableBySingles,
  solve,
  type Grid
} from './sudoku'

const parse = (s: string): Grid => [...s].map((c) => (c === '.' ? 0 : Number(c)))

// 널리 쓰이는 예제 문제와 그 해.
const PUZZLE = parse(
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'
)
const SOLUTION = parse(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
)

const isValidSolution = (g: Grid): boolean =>
  g.length === 81 &&
  UNITS.every((u) => new Set(u.map((i) => g[i])).size === 9 && u.every((i) => g[i] >= 1))

describe('단위·이웃', () => {
  it('27개 단위, 칸마다 이웃 20개', () => {
    expect(UNITS).toHaveLength(27)
    expect(PEERS.every((p) => p.length === 20)).toBe(true)
  })
})

describe('풀이', () => {
  it('예제 문제를 푼다', () => {
    expect(solve(PUZZLE)).toEqual(SOLUTION)
    expect(countSolutions(PUZZLE)).toBe(1)
  })

  it('빈 판은 해가 여럿 (limit 에서 멈춤)', () => {
    expect(countSolutions(Array(81).fill(0))).toBe(2)
    expect(countSolutions(Array(81).fill(0), 5)).toBe(5)
  })

  it('규칙 위반 판은 해가 없다', () => {
    const bad = PUZZLE.slice()
    bad[2] = 5 // 같은 행에 5가 둘
    expect(countSolutions(bad)).toBe(0)
    expect(solve(bad)).toBeNull()
  })

  it('입력 판을 바꾸지 않는다', () => {
    const copy = PUZZLE.slice()
    solve(PUZZLE)
    countSolutions(PUZZLE)
    expect(PUZZLE).toEqual(copy)
  })

  it('예제 문제는 싱글만으로 풀린다', () => {
    expect(solvableBySingles(PUZZLE)).toBe(true)
  })
})

describe('생성', () => {
  it('무작위 완성 판은 올바르다', () => {
    expect(isValidSolution(randomSolution(seededRng(1)))).toBe(true)
  })

  it('같은 시드면 같은 문제', () => {
    expect(generate('easy', seededRng(7))).toEqual(generate('easy', seededRng(7)))
  })

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    it(`${difficulty}: 유일해이고 해와 어긋나지 않는다`, () => {
      for (const seed of [1, 2, 3]) {
        const { puzzle, solution } = generate(difficulty, seededRng(seed))
        expect(isValidSolution(solution)).toBe(true)
        expect(countSolutions(puzzle, 2)).toBe(1)
        expect(puzzle.every((v, i) => v === 0 || v === solution[i])).toBe(true)
        const clues = puzzle.filter((v) => v !== 0).length
        expect(clues).toBeGreaterThanOrEqual(TARGET_CLUES[difficulty])
        expect(clues).toBeLessThan(TARGET_CLUES[difficulty] + 8)
      }
    })
  }

  it('쉬움·보통은 싱글만으로 풀린다', () => {
    for (const seed of [1, 2, 3]) {
      expect(solvableBySingles(generate('easy', seededRng(seed)).puzzle)).toBe(true)
      expect(solvableBySingles(generate('medium', seededRng(seed)).puzzle)).toBe(true)
    }
  })

  it('어려움이 쉬움보다 힌트가 적다', () => {
    const clues = (d: 'easy' | 'hard'): number =>
      generate(d, seededRng(5)).puzzle.filter((v) => v !== 0).length
    expect(clues('hard')).toBeLessThan(clues('easy'))
  })
})
