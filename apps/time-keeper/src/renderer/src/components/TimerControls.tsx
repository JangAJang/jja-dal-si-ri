import { CATEGORIES, type ActiveSession } from '../../../shared/timer'
import type { Selection } from '../hooks'
import { useT } from '../i18n'

interface Props {
  active: ActiveSession | null
  selection: Selection
  /** 미니 창용: 한 줄, 작은 키 */
  compact?: boolean
}

/**
 * 분야 키 3개 + 시작·종료 키. 기본 모드와 미니 모드가 같은 흐름을 쓴다.
 * 진행 중인 분야 키는 눌린 채로 걸려 있고(래칭), 준비된 분야는 키 위 LED 가 깜빡인다.
 */
export function TimerControls({ active, selection, compact = false }: Props): React.JSX.Element {
  const t = useT()
  const { selected, pick, canStart, start, stop } = selection

  const categories = CATEGORIES.map((c) => {
    const running = active?.category === c
    const ready = selected === c
    return (
      <button
        key={c}
        className={[
          'key',
          'category',
          `cat-${c}`,
          running ? 'is-latched' : '',
          ready ? 'is-ready' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={running}
        onClick={() => pick(c)}
      >
        <span className="led" aria-hidden />
        <span className="key-face">{t.category[c]}</span>
      </button>
    )
  })

  const go = (
    <button
      className={`key go ${selected ? `cat-${selected}` : ''}`}
      disabled={!canStart}
      onClick={start}
      title={t.start}
    >
      <span className="key-face">{compact ? t.startShort : t.start}</span>
    </button>
  )
  const halt = (
    <button className="key halt" disabled={!active} onClick={stop} title={t.stop}>
      <span className="key-face">{compact ? t.stopShort : t.stop}</span>
    </button>
  )

  if (compact) {
    return (
      <div className="keys compact">
        {categories}
        {go}
        {halt}
      </div>
    )
  }
  return (
    <section className="keys">
      <div className="key-row categories">{categories}</div>
      <div className="key-row actions">
        {go}
        {halt}
      </div>
    </section>
  )
}
