import { useCallback, useEffect } from 'react'
import { newChess, type ChessGame } from '../../shared/chess'
import type { GameKind } from '../../shared/games'
import { PANEL_SCALE } from '../../shared/settings'
import { newSudoku, type SudokuGame } from '../../shared/sudokuGame'
import { useGames, usePanelVisible, useSettings } from './hooks'
import { useT } from './i18n'
import ChessView from './views/ChessView'
import SudokuView from './views/SudokuView'

// 패널: 위쪽 게임 탭 + 마지막에 하던 게임. 두 게임 상태는 따로 유지한다.
function App(): React.JSX.Element {
  const [games, update] = useGames()
  const visible = usePanelVisible()
  const settings = useSettings()
  const t = useT()

  // 처음이거나 저장된 판이 깨졌으면 보통 난이도로 새 판.
  useEffect(() => {
    if (games && !games.sudoku) update((g) => ({ ...g, sudoku: newSudoku('medium') }))
    if (games && !games.chess) update((g) => ({ ...g, chess: newChess('easy', 'w') }))
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

  if (!games || !settings) return <main className="panel" />
  const pick = (lastGame: GameKind): void => update((g) => ({ ...g, lastGame }))

  const body = (): React.JSX.Element => {
    if (games.lastGame === 'sudoku' && games.sudoku)
      return (
        <SudokuView
          game={games.sudoku}
          visible={visible}
          showErrors={settings.showErrors}
          onChange={setSudoku}
        />
      )
    if (games.lastGame === 'chess' && games.chess)
      return <ChessView game={games.chess} visible={visible} onChange={setChess} />
    return <section className="board-slot">{t.loading}</section>
  }

  return (
    // 패널 크기 설정은 CSS zoom 으로 (창은 main 이 같은 배율로 키운다). setZoomFactor 는 같은 출처의 설정 창까지 바꿔서 쓰지 않는다.
    <main className="panel" style={{ zoom: PANEL_SCALE[settings.panelSize] }}>
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
        <button className="gear" title={t.openSettings} onClick={() => window.api.openSettings()}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>
      {body()}
    </main>
  )
}

export default App
