interface Props {
  /** 윗줄 상태 문구 (한글) */
  label: string
  /** "HH:MM:SS" */
  time: string
  /** 아랫줄 보조 문구 (진행 중 전환 예고 등). 없으면 줄 높이만 차지한다. */
  note?: string
  size?: 'large' | 'small'
}

/**
 * 액정 창. 숫자는 7세그먼트 글꼴로 그리고, 그 뒤에 꺼진 세그먼트("88:88:88")를
 * 흐리게 깔아 실제 LCD 처럼 보이게 한다.
 */
export function Lcd({ label, time, note, size = 'large' }: Props): React.JSX.Element {
  const ghost = time.replace(/\d/g, '8')
  return (
    <div className={`lcd lcd-${size}`}>
      <div className="lcd-label">{label}</div>
      <div className="lcd-digits" aria-label={time}>
        <span className="lcd-ghost" aria-hidden>
          {ghost}
        </span>
        <span className="lcd-lit">{time}</span>
      </div>
      {size === 'large' && <div className="lcd-note">{note || ' '}</div>}
    </div>
  )
}
