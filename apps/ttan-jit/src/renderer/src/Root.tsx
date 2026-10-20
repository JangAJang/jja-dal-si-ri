import { useEffect } from 'react'
import { MESSAGES } from '../../shared/labels'
import App from './App'
import { useSettings } from './hooks'
import { MessagesContext } from './i18n'
import SettingsView from './views/SettingsView'

// 같은 렌더러를 두 창이 쓴다: 패널(기본)과 설정 창(#settings).
// 설정의 locale(main 이 OS 언어까지 따져 정함)에 맞는 문구 묶음을 아래로 내려준다.
export default function Root(): React.JSX.Element {
  const settings = useSettings()
  const locale = settings?.locale ?? 'ko'
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return (
    <MessagesContext.Provider value={MESSAGES[locale]}>
      {location.hash === '#settings' ? <SettingsView /> : <App />}
    </MessagesContext.Provider>
  )
}
