import { useCallback, useEffect } from 'react'
import { newChess, type ChessGame } from '../../shared/chess'
import type { GameKind } from '../../shared/games'
import { ko as t } from '../../shared/labels'
import { newSudoku, type SudokuGame } from '../../shared/sudokuGame'
import { useGames, usePanelVisible } from './hooks'
import ChessView from './views/ChessView'
import SudokuView from './views/SudokuView'

// 패널: 위쪽 게임 탭 + 마지막에 하던 게임. 두 게임 상태는 따로 유지한다.
function App(): React.JSX.Element {
  const [games, update] = useGames()
  const visible = usePanelVisible()

  // 처음이거나 저장된 판이 깨졌으면 보통 난이도로 새 판.
  useEffect(() => {
    if (games && !games.sudoku) update((g) => ({ ...g, sudoku: newSudoku('medium') }))
    if (games && !games.chess) update((g) => ({ ...g, chess: newChess('medium', 'w') }))
  }, [games, update])

  const setSudoku = useCallback(
    (fn: (s: SudokuGame) => SudokuGame) =>
      update((g) => (g.sudoku ? { ...g, sudoku: fn(g.sudoku) } : g)),
    [update]
  )
  const setChess = useCallback(
    (fn: (c: ChessGame) => ChessGame) =>
      update((g) => (g.chess ? { ...g, chess: fn(g.chess) } : g)),
    [update]
  )

  if (!games) return <main className="panel" />
  const pick = (lastGame: GameKind): void => update((g) => ({ ...g, lastGame }))

  const body = (): React.JSX.Element => {
    if (games.lastGame === 'sudoku' && games.sudoku)
      return <SudokuView game={games.sudoku} visible={visible} onChange={setSudoku} />
    if (games.lastGame === 'chess' && games.chess)
      return <ChessView game={games.chess} visible={visible} onChange={setChess} />
    return <section className="board-slot">{t.loading}</section>
  }

  return (
    <main className="panel">
      <nav className="tabs" role="tablist">
        {(['chess', 'sudoku'] as const).map((kind) => (
          <button
            key={kind}
            role="tab"
            aria-selected={games.lastGame === kind}
            className="tab"
            onClick={() => pick(kind)}
          >
            {t.tabs[kind]}
          </button>
        ))}
      </nav>
      {body()}
    </main>
  )
}

export default App
