import { useState } from 'react'
import type { SyncStatus } from '../../../shared/sync'
import { useNow, useSyncStatus } from '../hooks'
import { useT } from '../i18n'

/** 사용자가 직접 OAuth 클라이언트를 만드는 방법 (앱 README 와 같은 내용) */
const SETUP_GUIDE_URL =
  'https://github.com/JangAJang/jja-dal-si-ri/blob/main/apps/time-keeper/docs/google-drive-setup.md'

/** 클라이언트 ID·비밀번호 입력 후 구글 로그인 (연결 안 됨 / 다시 로그인 필요) */
function ConnectForm({ initialClientId }: { initialClientId: string }): React.JSX.Element {
  const t = useT()
  const [clientId, setClientId] = useState(initialClientId)
  const [secret, setSecret] = useState('')
  return (
    <form
      className="sync-form"
      onSubmit={(e) => {
        e.preventDefault()
        window.api.syncConnect({ clientId, clientSecret: secret || undefined })
      }}
    >
      <label>
        <span>{t.syncClientId}</span>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="…apps.googleusercontent.com"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <label>
        <span>{t.syncClientSecret}</span>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
        />
      </label>
      <div className="sync-actions">
        <a href={SETUP_GUIDE_URL} target="_blank" rel="noreferrer">
          {t.syncHowTo}
        </a>
        <button type="submit" className="pill primary" disabled={!clientId.trim()}>
          {t.syncConnect}
        </button>
      </div>
      <p className="hint">{t.syncSameIdHint}</p>
    </form>
  )
}

function StatusLine({ status }: { status: SyncStatus }): React.JSX.Element {
  const t = useT()
  const now = useNow()
  if (status.state === 'syncing') return <p className="sync-line">{t.syncSyncing}</p>
  return (
    <p className="sync-line">
      {status.lastSyncedAt === null
        ? t.syncNever
        : t.syncLast(t.ago(now - status.lastSyncedAt), status.deviceCount)}
    </p>
  )
}

/** 설정 탭의 구글 드라이브 동기화 (#7) */
export function SyncPanel({ autoHandoff }: { autoHandoff: boolean }): React.JSX.Element {
  const t = useT()
  const status = useSyncStatus()

  return (
    <section className="panel sync">
      <h2>{t.syncTitle}</h2>
      {!status ? null : status.state === 'connecting' ? (
        <div className="sync-actions">
          <p className="sync-line">{t.syncConnecting}</p>
          <button className="pill" onClick={() => window.api.syncCancel()}>
            {t.syncCancel}
          </button>
        </div>
      ) : status.connected && status.error !== 'needs_login' ? (
        <>
          <StatusLine status={status} />
          {status.error && (
            <p className="sync-error" role="alert">
              {t.syncError[status.error]}
            </p>
          )}
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoHandoff}
              onChange={(e) => window.api.setSettings({ autoHandoff: e.target.checked })}
            />
            <span>
              <strong>{t.settingsAutoHandoff}</strong>
              <small>{t.settingsAutoHandoffHint}</small>
            </span>
          </label>
          <div className="sync-actions">
            <button className="pill" onClick={() => window.api.syncDisconnect()}>
              {t.syncDisconnect}
            </button>
            <button
              className="pill primary"
              disabled={status.state === 'syncing'}
              onClick={() => window.api.syncNow()}
            >
              {status.error ? t.syncRetry : t.syncNow}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sync-intro">{t.syncIntro}</p>
          {status.error && (
            <p className="sync-error" role="alert">
              {t.syncError[status.error]}
            </p>
          )}
          <ConnectForm key={status.clientId ?? ''} initialClientId={status.clientId ?? ''} />
        </>
      )}
    </section>
  )
}
