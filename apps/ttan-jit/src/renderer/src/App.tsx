import { useCallback, useEffect } from 'react'
import type { GameKind } from '../../shared/games'
import { ko as t } from '../../shared/labels'
import { newSudoku, type SudokuGame } from '../../shared/sudokuGame'
import { useGames, usePanelVisible } from './hooks'
import SudokuView from './views/SudokuView'

// 패널: 위쪽 게임 탭 + 마지막에 하던 게임. 체스는 #35에서 채운다.
function App(): React.JSX.Element {
  const [games, update] = useGames()
  const visible = usePanelVisible()

  // 처음이거나 저장된 판이 깨졌으면 보통 난이도로 새 판.
  useEffect(() => {
    if (games && !games.sudoku) update((g) => ({ ...g, sudoku: newSudoku('medium') }))
  }, [games, update])

  const setSudoku = useCallback(
    (fn: (s: SudokuGame) => SudokuGame) =>
      update((g) => (g.sudoku ? { ...g, sudoku: fn(g.sudoku) } : g)),
    [update]
  )

  if (!games) return <main className="panel" />
  const pick = (lastGame: GameKind): void => update((g) => ({ ...g, lastGame }))

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
      {games.lastGame === 'sudoku' ? (
        games.sudoku ? (
          <SudokuView game={games.sudoku} visible={visible} onChange={setSudoku} />
        ) : (
          <section className="board-slot">{t.sudoku.loading}</section>
        )
      ) : (
        <section className="board-slot">{t.chessPlaceholder}</section>
      )}
    </main>
  )
}

export default App
