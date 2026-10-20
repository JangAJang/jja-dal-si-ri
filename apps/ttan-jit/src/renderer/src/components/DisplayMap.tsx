import type { Corner } from '../../../shared/hotzone'
import { isCornerBlocked, sortDisplays, type DisplayInfo } from '../../../shared/displays'
import { CORNERS } from '../../../shared/settings'
import { useT } from '../i18n'

const MAX_W = 340
const MAX_H = 150

interface Props {
  displays: DisplayInfo[]
  /** 지금 핫존이 있는 모니터 (고른 모니터가 없으면 주 모니터). */
  activeId: number | undefined
  corner: Corner
  onPick: (display: DisplayInfo, corner: Corner) => void
}

/**
 * 모니터 배치 그림 (#45). OS 배치를 비율대로 줄여 그리고, 모니터마다 네 모서리 버튼을 둔다.
 * 옆 모니터와 맞닿아 커서가 멈추지 않는 모서리는 흐리게 하고 고를 수 없게 한다.
 */
export default function DisplayMap({
  displays,
  activeId,
  corner,
  onPick
}: Props): React.JSX.Element {
  const t = useT()
  const sorted = sortDisplays(displays)
  if (sorted.length === 0) return <div className="display-map" />

  const minX = Math.min(...sorted.map((d) => d.bounds.x))
  const minY = Math.min(...sorted.map((d) => d.bounds.y))
  const maxX = Math.max(...sorted.map((d) => d.bounds.x + d.bounds.width))
  const maxY = Math.max(...sorted.map((d) => d.bounds.y + d.bounds.height))
  const scale = Math.min(MAX_W / (maxX - minX), MAX_H / (maxY - minY))

  return (
    <div
      className="display-map"
      style={{ width: (maxX - minX) * scale, height: (maxY - minY) * scale }}
      role="radiogroup"
      aria-label={t.settings.corner}
    >
      {sorted.map((d, i) => {
        const name = t.settings.displayName(i + 1, d.primary)
        return (
          <div
            key={d.id}
            className={`display${d.id === activeId ? ' active' : ''}`}
            title={d.label || name}
            style={{
              left: (d.bounds.x - minX) * scale,
              top: (d.bounds.y - minY) * scale,
              width: d.bounds.width * scale,
              height: d.bounds.height * scale
            }}
          >
            <span className="display-name">
              {i + 1}
              {d.primary && <small>{t.settings.mainBadge}</small>}
            </span>
            {CORNERS.map((c) => {
              const blocked = isCornerBlocked(d, c, displays)
              return (
                <button
                  key={c}
                  role="radio"
                  aria-checked={d.id === activeId && corner === c}
                  disabled={blocked}
                  className={`dcorner dcorner-${c}`}
                  title={`${name} · ${t.settings.corners[c]}`}
                  onClick={() => onPick(d, c)}
                >
                  <span className="sr">{`${name} · ${t.settings.corners[c]}`}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
