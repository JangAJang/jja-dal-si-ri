// 스도쿠 풀이·생성 (docs/design.md > 스도쿠). 판은 길이 81 배열, 0 은 빈칸.
// 후보는 9비트 마스크(숫자 d → 1 << (d - 1)).

export type Grid = number[]
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Rng = () => number

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const ALL = 0x1ff

export const rowOf = (i: number): number => Math.floor(i / 9)
export const colOf = (i: number): number => i % 9
export const boxOf = (i: number): number => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3)

/** 행 9 + 열 9 + 상자 9 = 27개 단위. */
export const UNITS: number[][] = (() => {
  const units: number[][] = Array.from({ length: 27 }, () => [])
  for (let i = 0; i < 81; i++) {
    units[rowOf(i)].push(i)
    units[9 + colOf(i)].push(i)
    units[18 + boxOf(i)].push(i)
  }
  return units
})()

/** 각 칸과 같은 행·열·상자에 있는 다른 칸 20개. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) => {
  const set = new Set<number>()
  for (const u of [UNITS[rowOf(i)], UNITS[9 + colOf(i)], UNITS[18 + boxOf(i)]]) {
    for (const j of u) if (j !== i) set.add(j)
  }
  return [...set]
})

export const bit = (d: number): number => 1 << (d - 1)

function popcount(m: number): number {
  let n = 0
  for (; m; m &= m - 1) n++
  return n
}

function digitsOf(mask: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d)
  return out
}

/** 시드를 주면 늘 같은 수열을 내는 난수 (테스트용). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

interface Masks {
  rows: number[]
  cols: number[]
  boxes: number[]
}

/** 판의 행·열·상자별 사용 숫자. 규칙 위반(같은 단위에 같은 숫자)이면 null. */
function masksOf(grid: Grid): Masks | null {
  const m: Masks = { rows: Array(9).fill(0), cols: Array(9).fill(0), boxes: Array(9).fill(0) }
  for (let i = 0; i < 81; i++) {
    const d = grid[i]
    if (!d) continue
    const b = bit(d)
    if ((m.rows[rowOf(i)] | m.cols[colOf(i)] | m.boxes[boxOf(i)]) & b) return null
    m.rows[rowOf(i)] |= b
    m.cols[colOf(i)] |= b
    m.boxes[boxOf(i)] |= b
  }
  return m
}

/** 후보가 가장 적은 빈칸부터 채우는 백트래킹. limit 개를 찾으면 멈춘다. */
function search(g: Grid, m: Masks, limit: number, rng: Rng | null, out: Grid | null): number {
  let best = -1
  let bestMask = 0
  let bestCount = 10
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue
    const mask = ALL & ~(m.rows[rowOf(i)] | m.cols[colOf(i)] | m.boxes[boxOf(i)])
    const n = popcount(mask)
    if (n === 0) return 0
    if (n < bestCount) {
      best = i
      bestMask = mask
      bestCount = n
      if (n === 1) break
    }
  }
  if (best === -1) {
    if (out && out.length === 0) out.push(...g)
    return 1
  }
  const digits = digitsOf(bestMask)
  if (rng) shuffle(digits, rng)
  const r = rowOf(best)
  const c = colOf(best)
  const bx = boxOf(best)
  let total = 0
  for (const d of digits) {
    const b = bit(d)
    g[best] = d
    m.rows[r] |= b
    m.cols[c] |= b
    m.boxes[bx] |= b
    total += search(g, m, limit - total, rng, out)
    g[best] = 0
    m.rows[r] &= ~b
    m.cols[c] &= ~b
    m.boxes[bx] &= ~b
    if (total >= limit) break
  }
  return total
}

/** 해의 개수 (limit 에서 멈춤). 유일해 확인은 countSolutions(grid, 2) === 1. */
export function countSolutions(grid: Grid, limit = 2): number {
  const m = masksOf(grid)
  return m ? search(grid.slice(), m, limit, null, null) : 0
}

export function solve(grid: Grid): Grid | null {
  const m = masksOf(grid)
  if (!m) return null
  const out: Grid = []
  return search(grid.slice(), m, 1, null, out) ? out : null
}

/** 빈 판에서 무작위로 채운 완성 판. */
export function randomSolution(rng: Rng): Grid {
  const out: Grid = []
  search(Array(81).fill(0), masksOf(Array(81).fill(0))!, 1, rng, out)
  return out
}

/**
 * 싱글(그 칸에 들어갈 숫자가 하나뿐 / 그 단위에서 그 숫자가 갈 칸이 하나뿐)만으로 풀리는지.
 * 쉬움·보통은 이 방법만으로 풀리는 문제만 낸다.
 */
export function solvableBySingles(puzzle: Grid): boolean {
  const g = puzzle.slice()
  const m = masksOf(g)
  if (!m) return false
  const place = (i: number, d: number): void => {
    g[i] = d
    m.rows[rowOf(i)] |= bit(d)
    m.cols[colOf(i)] |= bit(d)
    m.boxes[boxOf(i)] |= bit(d)
  }
  const cand = (i: number): number =>
    g[i] ? 0 : ALL & ~(m.rows[rowOf(i)] | m.cols[colOf(i)] | m.boxes[boxOf(i)])

  let progress = true
  while (progress) {
    progress = false
    for (let i = 0; i < 81; i++) {
      const c = cand(i)
      if (!g[i] && c === 0) return false
      if (popcount(c) === 1) {
        place(i, digitsOf(c)[0])
        progress = true
      }
    }
    for (const unit of UNITS) {
      for (let d = 1; d <= 9; d++) {
        let spot = -1
        let count = 0
        for (const i of unit) {
          if (g[i] === d) {
            count = -1
            break
          }
          if (cand(i) & bit(d)) {
            spot = i
            count++
          }
        }
        if (count === 1) {
          place(spot, d)
          progress = true
        }
      }
    }
  }
  return g.every((v) => v !== 0)
}

/** 난이도별 목표 힌트 수. 유일해를 지키며 지우다 보면 이보다 조금 많이 남을 수 있다. */
export const TARGET_CLUES: Record<Difficulty, number> = { easy: 38, medium: 30, hard: 24 }

export interface Puzzle {
  puzzle: Grid
  solution: Grid
}

/**
 * 유일해 문제 생성. 완성 판에서 무작위 순서로 칸을 지우되, 해가 둘 이상이 되면 되돌린다.
 * 쉬움·보통은 싱글만으로 풀려야 하고, 어려움은 싱글만으로 안 풀리는 문제를 우선한다.
 */
export function generate(difficulty: Difficulty, rng: Rng = Math.random): Puzzle {
  let last: Puzzle | null = null
  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = randomSolution(rng)
    const puzzle = solution.slice()
    let clues = 81
    for (const i of shuffle([...Array(81).keys()], rng)) {
      if (clues <= TARGET_CLUES[difficulty]) break
      const v = puzzle[i]
      puzzle[i] = 0
      if (countSolutions(puzzle, 2) === 1) clues--
      else puzzle[i] = v
    }
    last = { puzzle, solution }
    const singles = solvableBySingles(puzzle)
    if (difficulty === 'hard' ? !singles : singles) return last
  }
  return last!
}
