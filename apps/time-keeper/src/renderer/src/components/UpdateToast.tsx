import { useUpdate } from '../hooks'
import { useT } from '../i18n'

/** 새 버전 알림 (#9). 창 아래에 떠서 레이아웃을 밀지 않는다. 자동 설치 없이 다운로드 페이지만 연다. */
export function UpdateToast(): React.JSX.Element | null {
  const t = useT()
  const update = useUpdate()
  if (!update) return null
  return (
    <div className="update-toast" role="status">
      <span>{t.updateAvailable(update.version)}</span>
      <a className="pill primary" href={update.url} target="_blank" rel="noreferrer">
        {t.updateGet}
      </a>
      <button className="pill" onClick={() => window.api.updateDismiss()}>
        {t.updateLater}
      </button>
    </div>
  )
}
