import { useEffect, useRef, useState } from 'react'
import { decodeConnectionCode, parseKeyFile } from '../../../shared/connectionCode'
import type { CloudFolder, SyncStatus } from '../../../shared/sync'
import { useNow, useSyncStatus } from '../hooks'
import { useT } from '../i18n'

/** 사용자가 직접 OAuth 클라이언트를 만드는 방법 (앱 README 와 같은 내용) */
const SETUP_GUIDE_URL =
  'https://github.com/JangAJang/jja-dal-si-ri/blob/main/apps/time-keeper/docs/google-drive-setup.md'

/** 폴더 방식 (#25): 찾은 클라우드 폴더를 누르거나 직접 고르기 */
function FolderChoice(): React.JSX.Element {
  const t = useT()
  const [candidates, setCandidates] = useState<CloudFolder[] | null>(null)
  useEffect(() => {
    window.api.syncFolderCandidates().then(setCandidates)
  }, [])

  return (
    <div className="sync-choice">
      <h3>{t.syncFolderTitle}</h3>
      <p className="sync-intro">{t.syncFolderIntro}</p>
      {candidates && candidates.length > 0 && (
        <>
          <p className="sync-sub">{t.syncFolderFound}</p>
          <div className="folder-list">
            {candidates.map((c) => (
              <button
                key={c.path}
                className="folder-option"
                onClick={() => window.api.syncConnectFolder(c.path)}
              >
                <strong>{t.cloudName[c.provider]}</strong>
                <small>{c.path}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {candidates && candidates.length === 0 && <p className="hint">{t.syncFolderNone}</p>}
      <div className="sync-actions">
        <button
          className="pill"
          onClick={async () => {
            const path = await window.api.syncPickFolder()
            if (path) await window.api.syncConnectFolder(path)
          }}
        >
          {t.syncPickFolder}
        </button>
      </div>
    </div>
  )
}

/** 구글 계정(내 키): 연결 코드 붙여넣기 · 키 파일 불러오기/끌어다 놓기 · 직접 입력 */
function ConnectForm({ initialClientId }: { initialClientId: string }): React.JSX.Element {
  const t = useT()
  const [clientId, setClientId] = useState(initialClientId)
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const readKeyFile = async (file: File | undefined): Promise<void> => {
    if (!file) return
    const key = parseKeyFile(await file.text())
    if (typeof key === 'string') {
      setProblem(t.syncKeyFileError[key])
      return
    }
    setClientId(key.clientId)
    setSecret(key.clientSecret ?? '')
    setProblem(null)
  }

  return (
    <form
      className="sync-form drop-zone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        void readKeyFile(e.dataTransfer.files[0])
      }}
      onSubmit={(e) => {
        e.preventDefault()
        window.api.syncConnect({ clientId, clientSecret: secret || undefined })
      }}
    >
      <label>
        <span>{t.syncCode}</span>
        <input
          value={code}
          placeholder={t.syncCodePlaceholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setCode(e.target.value)
            if (!e.target.value.trim()) return setProblem(null)
            const key = decodeConnectionCode(e.target.value)
            if (!key) return setProblem(t.syncCodeInvalid)
            setClientId(key.clientId)
            setSecret(key.clientSecret ?? '')
            setProblem(null)
          }}
        />
      </label>
      <div className="key-file">
        <button type="button" className="pill" onClick={() => fileInput.current?.click()}>
          {t.syncKeyFile}
        </button>
        <span className="hint">{t.syncKeyDrop}</span>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void readKeyFile(e.target.files?.[0])}
        />
      </div>
      {problem && (
        <p className="sync-error" role="alert">
          {problem}
        </p>
      )}
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

/** 구글(내 키) 방식: 다른 컴퓨터용 연결 코드 복사 */
function CopyCode(): React.JSX.Element {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <div className="copy-code">
      <button
        className="pill"
        onClick={async () => {
          const code = await window.api.syncExportCode()
          if (!code) return
          await navigator.clipboard.writeText(code)
          setCopied(true)
        }}
      >
        {t.syncCopyCode}
      </button>
      <p className="hint">{copied ? t.syncCopied : t.syncCodeHint}</p>
    </div>
  )
}

/** 설정 탭의 동기화 (#7, #25) */
export function SyncPanel({ autoHandoff }: { autoHandoff: boolean }): React.JSX.Element {
  const t = useT()
  const status = useSyncStatus()
  if (!status) return <section className="panel sync" />

  const connected = status.connected && status.error !== 'needs_login'

  return (
    <section className="panel sync">
      <h2>{t.syncTitle}</h2>
      {status.error && status.state !== 'connecting' && (
        <p className="sync-error" role="alert">
          {t.syncError[status.error]}
        </p>
      )}

      {status.state === 'connecting' ? (
        <div className="sync-actions">
          <p className="sync-line">{t.syncConnecting}</p>
          <button className="pill" onClick={() => window.api.syncCancel()}>
            {t.syncCancel}
          </button>
        </div>
      ) : connected ? (
        <>
          <p className="sync-mode">
            {status.mode === 'folder' && status.folderPath
              ? t.syncModeFolder(status.folderPath)
              : t.syncModeGoogle}
          </p>
          <StatusLine status={status} />
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
          {status.mode === 'google' && <CopyCode />}
        </>
      ) : (
        <>
          <FolderChoice />
          <details className="sync-advanced" open={status.error === 'needs_login'}>
            <summary>{t.syncGoogleAdvanced}</summary>
            <p className="sync-intro">{t.syncIntro}</p>
            <ConnectForm key={status.clientId ?? ''} initialClientId={status.clientId ?? ''} />
          </details>
        </>
      )}
    </section>
  )
}
