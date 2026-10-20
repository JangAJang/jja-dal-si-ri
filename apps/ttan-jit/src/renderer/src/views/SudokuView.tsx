import { useEffect, useRef, useState } from 'react'
import { DIFFICULTIES, PEERS, bit, type Difficulty } from '../../../shared/sudoku'
import {
  addElapsed,
  erase,
  formatElapsed,
  isGiven,
  isSolved,
  isWrong,
  newSudoku,
  setValue,
  toggleNote,
  undo,
  type SudokuGame
} from '../../../shared/sudokuGame'
import { useT } from '../i18n'

const CONFIRM_MS = 3000

interface Props {
  game: SudokuGame
  /** 패널이 보이는지. 숨겨진 동안은 풀이 시간이 가지 않는다. */
  visible: boolean
  /** 틀린 칸 빨간 표시 (설정). */
  showErrors: boolean
  onChange: (fn: (g: SudokuGame) => SudokuGame) => void
}

export default function SudokuView({
  game,
  visible,
  showErrors,
  onChange
}: Props): React.JSX.Element {
  const t = useT()
  const [selected, setSelected] = useState<number | null>(null)
  const [noteMode, setNoteMode] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>(game.difficulty)
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const solved = isSolved(game)

  // 풀이 시간: 보이는 동안만 실제 흐른 시간을 더한다. 숨기는 순간 남은 조각까지 더하고 멈춘다.
  useEffect(() => {
    if (!visible || solved) return
    let last = performance.now()
    const flush = (): void => {
      const now = performance.now()
      const ms = now - last
      last = now
      onChange((g) => addElapsed(g, ms))
    }
    const id = setInterval(flush, 1000)
    return () => {
      clearInterval(id)
      flush()
    }
  }, [visible, solved, onChange])

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    },
    []
  )

  // 키보드: 숫자·지우기·화살표·N(메모)·Ctrl+Z. 패널을 클릭해 포커스를 받은 뒤에만 들어온다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        onChange(undo)
      } else if (e.key.toLowerCase() === 'n') {
        setNoteMode((m) => !m)
      } else if (selected === null) {
        if (e.key.startsWith('Arrow')) setSelected(40)
        return
      } else if (/^[1-9]$/.test(e.key)) {
        const d = Number(e.key)
        onChange((g) => (noteMode ? toggleNote(g, selected, d) : setValue(g, selected, d)))
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        onChange((g) => erase(g, selected))
      } else if (e.key.startsWith('Arrow')) {
        const r = Math.floor(selected / 9)
        const c = selected % 9
        const [dr, dc] = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1]
        }[e.key] ?? [0, 0]
        setSelected(((r + dr + 9) % 9) * 9 + ((c + dc + 9) % 9))
      } else {
        return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, noteMode, onChange])

  const input = (d: number): void => {
    if (selected === null) return
    onChange((g) => (noteMode ? toggleNote(g, selected, d) : setValue(g, selected, d)))
  }

  const startNew = (): void => {
    // 하던 판이 있으면 한 번 더 눌러야 새 판 (대화상자 대신).
    if (!solved && game.history.length > 0 && !confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), CONFIRM_MS)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirming(false)
    setSelected(null)
    onChange(() => newSudoku(difficulty))
  }

  const selValue = selected === null ? 0 : game.values[selected]
  const placed = (d: number): number => game.values.filter((v) => v === d).length

  const cellClass = (i: number): string => {
    const cls = ['cell']
    if (isGiven(game, i)) cls.push('given')
    if (showErrors && isWrong(game, i)) cls.push('wrong')
    if (i === selected) cls.push('selected')
    else if (selected !== null && PEERS[selected].includes(i)) cls.push('peer')
    if (selValue && game.values[i] === selValue && i !== selected) cls.push('same')
    return cls.join(' ')
  }

  return (
    <section className="sudoku">
      <div className="toolbar">
        <select
          className="control"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {t.difficulty[d]}
            </option>
          ))}
        </select>
        <button className={`control${confirming ? ' warn' : ''}`} onClick={startNew}>
          {confirming ? t.confirmNewGame : t.newGame}
        </button>
        <span className="elapsed">{formatElapsed(game.elapsedMs)}</span>
      </div>

      <div className="sudoku-main">
        <div className="grid">
          {Array.from({ length: 9 }, (_, b) => (
            <div key={b} className="box">
              {Array.from({ length: 9 }, (_, k) => {
                const i = (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3)
                const v = game.values[i]
                return (
                  <div key={i} className={cellClass(i)} onMouseDown={() => setSelected(i)}>
                    {v ? (
                      v
                    ) : game.notes[i] ? (
                      <span className="notes">
                        {Array.from({ length: 9 }, (_, n) => (
                          <span key={n}>{game.notes[i] & bit(n + 1) ? n + 1 : ''}</span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
          {solved && (
            <div className="solved">
              <strong>{t.sudoku.solved}</strong>
              <span>{formatElapsed(game.elapsedMs)}</span>
            </div>
          )}
        </div>

        <div className="side">
          <button
            className="control"
            aria-pressed={noteMode}
            onClick={() => setNoteMode((m) => !m)}
          >
            {t.sudoku.notes}
          </button>
          <button
            className="control"
            onClick={() => selected !== null && onChange((g) => erase(g, selected))}
          >
            {t.sudoku.erase}
          </button>
          <button className="control" onClick={() => onChange(undo)}>
            {t.sudoku.undo}
          </button>
        </div>
      </div>

      <div className="digits">
        {Array.from({ length: 9 }, (_, n) => (
          <button
            key={n}
            className={`digit${placed(n + 1) >= 9 ? ' done' : ''}`}
            onClick={() => input(n + 1)}
          >
            {n + 1}
          </button>
        ))}
      </div>
    </section>
  )
}
