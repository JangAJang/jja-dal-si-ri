import { IconExpand } from './Icons'
import { useT } from '../i18n'

/** 미니 창에서 기본 창으로 돌아가는 버튼. 더블클릭은 모르면 못 쓰니 늘 보이는 버튼을 둔다. */
export function ExpandButton({ className = '' }: { className?: string }): React.JSX.Element {
  const t = useT()
  return (
    <button
      className={`nub expand ${className}`}
      title={t.expand}
      aria-label={t.expand}
      onClick={() => window.api.openView('main')}
    >
      <IconExpand />
    </button>
  )
}
