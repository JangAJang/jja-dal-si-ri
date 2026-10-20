import { useState } from 'react'

type Game = 'chess' | 'sudoku'

// 게임 탭 자리만 잡아 둔 패널. 스도쿠는 #34, 체스는 #35에서 채운다.
function App(): React.JSX.Element {
  const [game, setGame] = useState<Game>('chess')

  return (
    <main className="panel">
      <nav className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={game === 'chess'}
          className="tab"
          onClick={() => setGame('chess')}
        >
          ♟ 체스
        </button>
        <button
          role="tab"
          aria-selected={game === 'sudoku'}
          className="tab"
          onClick={() => setGame('sudoku')}
        >
          9 스도쿠
        </button>
      </nav>
      <section className="board-slot">{game === 'chess' ? '체스판 자리' : '스도쿠 자리'}</section>
    </main>
  )
}

export default App
