import { useEffect, useMemo, useRef, useState } from 'react'
import type { Square } from 'chess.js'
import { ko as t } from '../../../shared/labels'
import {
  CHESS_LEVELS,
  applyMove,
  newChess,
  replay,
  statusOf,
  targets,
  type ChessGame,
  type ChessLevel,
  type SideChoice
} from '../../../shared/chess'
import type { EngineReply, EngineRequest } from '../chessWorker'

const CONFIRM_MS = 3000
/** 컴퓨터가 너무 빨리 두면 정신없으니 최소 이만큼은 생각하는 척한다. */
const MIN_THINK_MS = 350
const FILES = 'abcdefgh'
// 이모지로 바뀌지 않게 텍스트 표시 선택자(U+FE0E)를 붙인다.
const GLYPH: Record<string, string> = {
  k: '♚︎',
  q: '♛︎',
  r: '♜︎',
  b: '♝︎',
  n: '♞︎',
  p: '♟︎'
}

interface Props {
  game: ChessGame
  /** 패널이 보이는지. 숨겨지면 고르던(끌던) 수를 취소한다. */
  visible: boolean
  onChange: (fn: (g: ChessGame) => ChessGame) => void
}

export default function ChessView({ game, visible, onChange }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(null)
  // 핸들러는 렌더를 기다리지 않고 최신 선택·끌기 상태를 봐야 한다 (빠른 연속 입력 대비).
  const selectedRef = useRef<string | null>(null)
  const draggingRef = useRef(false)
  const [level, setLevel] = useState<ChessLevel>(game.level)
  const [side, setSide] = useState<SideChoice>(game.player)
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const worker = useRef<Worker | null>(null)
  const requestId = useRef(0)

  const board = useMemo(() => replay(game.moves), [game.moves])
  const status = board ? statusOf(board) : null
  const playing = status?.kind === 'playing'
  const engineTurn = !!board && playing && board.turn() !== game.player
  const myTurn = !!board && playing && board.turn() === game.player
  const moveTargets = selected && board ? targets(board, selected) : []
  const last = game.moves.at(-1)

  useEffect(() => {
    const w = new Worker(new URL('../chessWorker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    return () => w.terminate()
  }, [])

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    },
    []
  )

  // 숨겨지면 고르던 수를 취소한다 (끌던 중이어도). 화면 상태는 렌더 중에 바로 맞추고, ref 는 effect 에서.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    if (!visible) setSelected(null)
  }
  useEffect(() => {
    if (!visible) {
      selectedRef.current = null
      draggingRef.current = false
    }
  }, [visible])

  // 컴퓨터 차례면 Worker 에 맡긴다. 숨겨져도 계산은 끝까지 하고 수를 둔다.
  // 판이 바뀌면(새 판 등) 정리 함수가 이전 요청의 답을 버린다.
  useEffect(() => {
    const w = worker.current
    if (!engineTurn || !board || !w) return
    const id = ++requestId.current
    const movesLen = game.moves.length
    const started = performance.now()
    let timer: ReturnType<typeof setTimeout> | null = null
    const onMessage = (e: MessageEvent<EngineReply>): void => {
      if (e.data.id !== id || !e.data.move) return
      const { from, to } = e.data.move
      timer = setTimeout(
        () => onChange((g) => (g.moves.length === movesLen ? (applyMove(g, from, to) ?? g) : g)),
        Math.max(0, MIN_THINK_MS - (performance.now() - started))
      )
    }
    w.addEventListener('message', onMessage)
    w.postMessage({ id, fen: board.fen(), level: game.level } satisfies EngineRequest)
    return () => {
      w.removeEventListener('message', onMessage)
      if (timer) clearTimeout(timer)
    }
  }, [engineTurn, board, game.level, game.moves.length, onChange])

  const select = (square: string | null, drag = false): void => {
    selectedRef.current = square
    draggingRef.current = drag
    setSelected(square)
  }

  const tryMove = (to: string): boolean => {
    const from = selectedRef.current
    if (!from || !board || !targets(board, from).includes(to)) return false
    // 고를 때 본 판에만 둔다. 그사이 판이 바뀌었으면(컴퓨터 수·새 판) 엉뚱한 합법 수가 되지 않게 버린다.
    const seen = game.moves.length
    onChange((g) => (g.moves.length === seen ? (applyMove(g, from, to) ?? g) : g))
    select(null)
    return true
  }

  const onDown = (square: string): void => {
    if (!myTurn || !board) return
    if (tryMove(square)) return
    const piece = board.get(square as Square)
    if (piece && piece.color === game.player) select(square, true)
    else select(null)
  }

  const onUp = (square: string): void => {
    if (draggingRef.current && square !== selectedRef.current) tryMove(square)
    draggingRef.current = false
  }

  const startNew = (): void => {
    if (playing && game.moves.length > 0 && !confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), CONFIRM_MS)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirming(false)
    select(null)
    onChange(() => newChess(level, side))
  }

  const statusText = (): string => {
    if (!status) return ''
    if (status.kind === 'checkmate')
      return status.winner === game.player ? t.chess.win : t.chess.lose
    if (status.kind === 'draw') return t.chess.draw
    if (engineTurn) return t.chess.thinking
    return status.check ? t.chess.check : t.chess.yourTurn
  }

  // 내 색이 아래로 오게 판을 뒤집는다.
  const ranks = game.player === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const files = game.player === 'w' ? [...FILES] : [...FILES].reverse()
  const checkedKing =
    board && board.inCheck()
      ? board
          .board()
          .flat()
          .find((p) => p && p.type === 'k' && p.color === board.turn())?.square
      : undefined

  return (
    <section className="chess">
      <div className="toolbar">
        <select
          className="control"
          value={level}
          onChange={(e) => setLevel(e.target.value as ChessLevel)}
        >
          {CHESS_LEVELS.map((l) => (
            <option key={l} value={l}>
              {t.difficulty[l]}
            </option>
          ))}
        </select>
        <select
          className="control"
          value={side}
          onChange={(e) => setSide(e.target.value as SideChoice)}
        >
          {(['w', 'b', 'random'] as const).map((s) => (
            <option key={s} value={s}>
              {t.chess.side[s]}
            </option>
          ))}
        </select>
        <button className={`control${confirming ? ' warn' : ''}`} onClick={startNew}>
          {confirming ? t.confirmNewGame : t.newGame}
        </button>
        <span className={`status${status && status.kind !== 'playing' ? ' over' : ''}`}>
          {statusText()}
        </span>
      </div>

      <div className="chessboard" onPointerLeave={() => (draggingRef.current = false)}>
        {ranks.map((rank) =>
          files.map((file) => {
            const sq = `${file}${rank}`
            const piece = board?.get(sq as Square)
            const dark = (FILES.indexOf(file) + rank) % 2 === 1
            const cls = ['square', dark ? 'dark' : 'light']
            if (sq === selected) cls.push('selected')
            if (last && (last.slice(0, 2) === sq || last.slice(2, 4) === sq)) cls.push('last')
            if (sq === checkedKing) cls.push('check')
            const target = moveTargets.includes(sq)
            return (
              <div
                key={sq}
                className={cls.join(' ')}
                onPointerDown={() => onDown(sq)}
                onPointerUp={() => onUp(sq)}
              >
                {piece && <span className={`piece piece-${piece.color}`}>{GLYPH[piece.type]}</span>}
                {target && <span className={piece ? 'capture' : 'dot'} />}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
