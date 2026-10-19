// 툴바 아이콘. 이모지 대신 currentColor 를 따르는 얇은 선 아이콘을 쓴다.
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
}

/** 디지털 미니: 작은 LCD 리모컨 */
export function IconDigital(): React.JSX.Element {
  return (
    <svg {...base}>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M7 10v4M10 10v4M14 10h3v4h-3" />
    </svg>
  )
}

/** 아날로그 미니: 다이얼 */
export function IconAnalog(): React.JSX.Element {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12V6.5" />
    </svg>
  )
}

/** 항상 위에 박제 */
export function IconPin(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M9 3h6l-1 6 3 3H7l3-3z" />
      <path d="M12 12v9" />
    </svg>
  )
}
