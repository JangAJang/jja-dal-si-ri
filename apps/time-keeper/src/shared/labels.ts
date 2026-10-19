import type { Period } from './stats'
import type { KeyFileError } from './connectionCode'
import type { CloudProvider, SyncErrorCode } from './sync'
import { formatHMS, type ActiveSession, type Category } from './timer'

// 화면·트레이·대화상자 문구 (#8 한국어/영어). main 과 renderer 가 함께 쓴다.
// 톤: 능청스러운 반말 (#14, 사용자 확정). 영어도 같은 톤. 문구를 바꿀 때 두 언어를 같이 고친다.
// 두 언어가 같은 Messages 형식이라, 한쪽에 문구를 빠뜨리면 타입 오류가 난다.

export const LOCALES = ['ko', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export interface Messages {
  /** 분야 버튼·합계에 쓰는 짧은 이름 */
  category: Record<Category, string>
  /** 분야를 골랐지만 아직 [시작] 전 */
  ready: Record<Category, string>
  /** 진행 중 */
  running: Record<Category, string>
  /** 종료 확인창 첫 줄 */
  quitInterrupt: Record<Category, string>
  /** Date.getDay() 순서 (일요일 = 0) */
  weekday: string[]
  period: Record<Period, string>
  /** theme.ts 의 SHELL_PRESETS 와 같은 순서 */
  presetNames: string[]
  /** 설정의 언어 선택지 */
  languageName: Record<'auto' | Locale, string>

  appName: string
  idle: string
  start: string
  stop: string
  startShort: string
  stopShort: string
  today: string
  nextUp: (ready: string) => string
  trayOpen: string
  trayQuit: string
  toDigital: string
  toAnalog: string
  pinOn: string
  pinOff: string
  miniHint: string
  expand: string
  tabTimer: string
  tabStats: string
  tabSettings: string
  settingsShell: string
  settingsShellHint: string
  settingsLanguage: string
  reportCollapse: string
  reportExpand: string
  statsTotal: string
  statsEmpty: string
  statsDaily: string
  statsTooLong: string
  customFrom: string
  customTo: string
  hours: (h: number) => string
  dayTitle: (t: number) => string
  quitConfirmTitle: string
  quitConfirmDetail: string
  quitConfirmOk: string
  quitConfirmCancel: string
  // 구글 드라이브 동기화 (#7)
  syncTitle: string
  syncIntro: string
  syncClientId: string
  syncClientSecret: string
  syncHowTo: string
  syncSameIdHint: string
  syncConnect: string
  syncConnecting: string
  syncCancel: string
  syncNow: string
  syncSyncing: string
  syncDisconnect: string
  syncRetry: string
  syncReconnect: string
  syncNever: string
  syncLast: (when: string, devices: number) => string
  /** 경과 시간 → "방금", "3분 전" */
  ago: (ms: number) => string
  syncError: Record<SyncErrorCode, string>
  /** 로그인 후 브라우저에 뜨는 페이지 문구 */
  syncBrowserOk: string
  syncBrowserFail: string
  // 이어받기 (#7)
  settingsAutoHandoff: string
  settingsAutoHandoffHint: string
  handoffSentTitle: string
  handoffSentBody: (device: string, category: string) => string
  handoffReceivedTitle: string
  handoffReceivedBody: (device: string, category: string, time: string) => string
  // 동기화 연결 쉽게 (#25)
  syncFolderTitle: string
  syncFolderIntro: string
  syncFolderFound: string
  syncFolderNone: string
  syncPickFolder: string
  cloudName: Record<CloudProvider, string>
  syncGoogleAdvanced: string
  syncKeyFile: string
  syncKeyDrop: string
  syncKeyFileError: Record<KeyFileError, string>
  syncCode: string
  syncCodePlaceholder: string
  syncCodeInvalid: string
  syncCopyCode: string
  syncCopied: string
  syncCodeHint: string
  syncModeFolder: (path: string) => string
  syncModeGoogle: string
  // 새 버전 알림 (#9)
  updateAvailable: (version: string) => string
  updateGet: string
  updateLater: string
  trayUpdate: (version: string) => string
}

const KO_WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export const ko: Messages = {
  category: { work: '일', break: '쉼', study: '공부' },
  ready: { work: '돈...벌어야겠지?', break: '숨고르기', study: '이제 진짜 공부뿐이야' },
  running: { work: '돈 버는 중 💸', break: '충전 중 🔋', study: '뇌 키우는 중 🧠' },
  quitInterrupt: {
    work: '잠깐, 돈 벌던 중이잖아!',
    break: '잠깐, 충전하던 중이잖아!',
    study: '잠깐, 뇌 키우던 중이잖아!'
  },
  weekday: KO_WEEKDAY,
  period: { today: '오늘', week: '이번 주', month: '이번 달', custom: '직접' },
  presetNames: ['민트', '버터', '하늘', '라벤더', '복숭아', '차콜'],
  languageName: { auto: '시스템 언어', ko: '한국어', en: 'English' },

  appName: '짜달시리 타이머',
  idle: '멍 때리는 중',
  start: '가보자고',
  stop: '그만!',
  startShort: '▶',
  stopShort: '■',
  today: '오늘의 성적표',
  nextUp: (ready) => `다음: ${ready}`,
  trayOpen: '나와봐',
  trayQuit: '오늘은 여기까지',
  toDigital: '쪼그맣게 (숫자)',
  toAnalog: '쪼그맣게 (시계)',
  pinOn: '맨 위에 박제',
  pinOff: '박제 풀기',
  miniHint: '더블클릭하면 다시 커져',
  expand: '다시 크게',
  tabTimer: '타이머',
  tabStats: '통계',
  tabSettings: '설정',
  settingsShell: '본체 색',
  settingsShellHint: '액정이랑 버튼 색은 그대로야',
  settingsLanguage: '언어',
  reportCollapse: '접기',
  reportExpand: '펼치기',
  statsTotal: '합계',
  statsEmpty: '이 기간엔 기록이 없어. 가보자고!',
  statsDaily: '날마다',
  statsTooLong: '두 달이 넘는 기간은 합계만 보여줘',
  customFrom: '부터',
  customTo: '까지',
  hours: (h) => `${h}시간`,
  dayTitle: (t) => {
    const d = new Date(t)
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${KO_WEEKDAY[d.getDay()]})`
  },
  quitConfirmTitle: '진짜 끌 거야?',
  quitConfirmDetail: '끄면 지금까지만 기록돼.',
  quitConfirmOk: '그래도 끌래',
  quitConfirmCancel: '아 맞다, 더 할게',
  syncTitle: '다른 컴퓨터와 동기화',
  syncIntro: '내 구글 드라이브에 기록을 올려서 다른 컴퓨터에서도 같이 봐.',
  syncClientId: '클라이언트 ID',
  syncClientSecret: '클라이언트 보안 비밀번호',
  syncHowTo: '키 받는 법',
  syncSameIdHint: '컴퓨터마다 같은 클라이언트 ID를 넣어야 서로의 기록이 보여.',
  syncConnect: '구글로 연결',
  syncConnecting: '브라우저에서 로그인해줘…',
  syncCancel: '취소',
  syncNow: '지금 동기화',
  syncSyncing: '동기화하는 중…',
  syncDisconnect: '연결 끊기',
  syncRetry: '다시 시도',
  syncReconnect: '다시 연결',
  syncNever: '아직 동기화 안 함',
  syncLast: (when, devices) => `마지막 동기화 ${when} · 다른 기기 ${devices}대`,
  ago: (ms) => {
    const m = Math.floor(ms / 60_000)
    if (m < 1) return '방금'
    if (m < 60) return `${m}분 전`
    const h = Math.floor(m / 60)
    return h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`
  },
  syncError: {
    needs_login: '로그인이 풀렸어. 다시 연결해줘. (구글 앱이 "테스트" 상태면 7일마다 풀려)',
    login_failed: '로그인에 실패했어. 클라이언트 ID랑 비밀번호를 확인해줘.',
    login_cancelled: '로그인이 취소됐어.',
    no_encryption: '이 컴퓨터에선 키를 안전하게 저장할 수 없어서 연결 못 해.',
    network: '인터넷 연결을 확인해줘. 연결되면 다시 해볼게.',
    drive: '구글 드라이브가 거절했어. 잠시 뒤에 다시 해볼게.',
    folder_unavailable:
      '폴더에 접근할 수 없어. 클라우드 앱이 켜져 있는지, 드라이브가 연결돼 있는지 봐줘.',
    folder_not_writable: '이 폴더에는 쓸 수가 없어. 다른 폴더를 골라줘.'
  },
  syncBrowserOk: '연결됐어! 이 창은 닫아도 돼.',
  syncBrowserFail: '연결이 안 됐어. 앱으로 돌아가서 다시 해줘.',
  settingsAutoHandoff: '다른 컴퓨터 타이머 자동으로 끄기',
  settingsAutoHandoffHint:
    '여기서 시작하면 다른 컴퓨터에서 돌던 건 그 시각에 끝내. 끄면 동시에 기록하고 다 합산해.',
  handoffSentTitle: '이어받았어',
  handoffSentBody: (device, category) =>
    `${device}에서 돌던 '${category}' 기록은 여기서 시작할 때 끝냈어.`,
  handoffReceivedTitle: '다른 컴퓨터가 이어받았어',
  handoffReceivedBody: (device, category, time) =>
    `${device}에서 시작해서 여기 '${category}' 기록은 ${time}에 끝냈어.`,
  syncFolderTitle: '폴더로 동기화 (추천)',
  syncFolderIntro:
    '구글 드라이브 데스크톱, Dropbox, OneDrive 같은 앱이 동기화하는 폴더를 고르면 끝. 로그인도 키도 필요 없어.',
  syncFolderFound: '이 컴퓨터에서 찾은 폴더',
  syncFolderNone:
    '클라우드 폴더를 못 찾았어. 구글 드라이브 데스크톱 앱을 깔거나, 동기화되는 폴더를 직접 골라줘.',
  syncPickFolder: '다른 폴더 고르기…',
  cloudName: {
    google: '구글 드라이브',
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    icloud: 'iCloud Drive'
  },
  syncGoogleAdvanced: '구글 계정으로 연결 (내 키 쓰기)',
  syncKeyFile: '키 파일 불러오기',
  syncKeyDrop: '구글에서 받은 키 파일(.json)을 여기로 끌어다 놓아도 돼',
  syncKeyFileError: {
    not_json: '키 파일이 아니야. 구글에서 받은 .json 파일을 골라줘.',
    wrong_type: '"웹 애플리케이션" 키야. "데스크톱 앱" 유형으로 다시 만들어줘.',
    missing_id: '키 파일에 클라이언트 ID가 없어.'
  },
  syncCode: '연결 코드',
  syncCodePlaceholder: '다른 컴퓨터에서 복사한 JJT1-… 코드',
  syncCodeInvalid: '연결 코드가 이상해. 다시 복사해 와줘.',
  syncCopyCode: '다른 컴퓨터용 연결 코드 복사',
  syncCopied: '복사했어! 다른 컴퓨터의 "연결 코드" 칸에 붙여 넣어.',
  syncCodeHint: '코드에 키가 들어 있어. 내 컴퓨터끼리만 쓰고 남한테 주지 마.',
  syncModeFolder: (path) => `폴더: ${path}`,
  syncModeGoogle: '구글 드라이브 (내 키)',
  updateAvailable: (v) => `새 버전 ${v} 나왔어!`,
  updateGet: '받으러 가기',
  updateLater: '나중에',
  trayUpdate: (v) => `새 버전 받기 (${v})`
}

const EN_WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EN_MONTH = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

export const en: Messages = {
  category: { work: 'Work', break: 'Break', study: 'Study' },
  ready: { work: 'Gotta make money...?', break: 'Catch my breath', study: 'Study. Only study.' },
  running: { work: 'Making money 💸', break: 'Recharging 🔋', study: 'Growing brain 🧠' },
  quitInterrupt: {
    work: 'Wait, you were making money!',
    break: 'Wait, you were recharging!',
    study: 'Wait, you were growing your brain!'
  },
  weekday: EN_WEEKDAY,
  period: { today: 'Today', week: 'Week', month: 'Month', custom: 'Custom' },
  presetNames: ['Mint', 'Butter', 'Sky', 'Lavender', 'Peach', 'Charcoal'],
  languageName: { auto: 'System', ko: '한국어', en: 'English' },

  appName: 'Jjadalsiri Timer',
  idle: 'Zoning out',
  start: "Let's go",
  stop: 'Enough!',
  startShort: '▶',
  stopShort: '■',
  today: "Today's report card",
  nextUp: (ready) => `Next: ${ready}`,
  trayOpen: 'Come out',
  trayQuit: "That's it for today",
  toDigital: 'Shrink (digits)',
  toAnalog: 'Shrink (dial)',
  pinOn: 'Pin on top',
  pinOff: 'Unpin',
  miniHint: 'Double-click to grow back',
  expand: 'Big again',
  tabTimer: 'Timer',
  tabStats: 'Stats',
  tabSettings: 'Settings',
  settingsShell: 'Body color',
  settingsShellHint: 'The screen and buttons keep their colors',
  settingsLanguage: 'Language',
  reportCollapse: 'Hide',
  reportExpand: 'Show',
  statsTotal: 'Total',
  statsEmpty: "Nothing here yet. Let's go!",
  statsDaily: 'Daily',
  statsTooLong: 'Over two months: totals only',
  customFrom: 'from',
  customTo: 'to',
  hours: (h) => `${h}h`,
  dayTitle: (t) => {
    const d = new Date(t)
    return `${EN_WEEKDAY[d.getDay()]}, ${EN_MONTH[d.getMonth()]} ${d.getDate()}`
  },
  quitConfirmTitle: 'Really quitting?',
  quitConfirmDetail: 'Quit now and only the time so far is saved.',
  quitConfirmOk: 'Quit anyway',
  quitConfirmCancel: 'Oh right, keep going',
  syncTitle: 'Sync across computers',
  syncIntro: 'Keep your records in your own Google Drive and see them on your other computers.',
  syncClientId: 'Client ID',
  syncClientSecret: 'Client secret',
  syncHowTo: 'How to get these',
  syncSameIdHint: 'Use the same client ID on every computer to see each other’s records.',
  syncConnect: 'Connect with Google',
  syncConnecting: 'Log in from your browser…',
  syncCancel: 'Cancel',
  syncNow: 'Sync now',
  syncSyncing: 'Syncing…',
  syncDisconnect: 'Disconnect',
  syncRetry: 'Retry',
  syncReconnect: 'Reconnect',
  syncNever: 'Not synced yet',
  syncLast: (when, devices) =>
    `Last synced ${when} · ${devices} other device${devices === 1 ? '' : 's'}`,
  ago: (ms) => {
    const m = Math.floor(ms / 60_000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m} min ago`
    const h = Math.floor(m / 60)
    return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`
  },
  syncError: {
    needs_login: 'Logged out. Connect again. (Apps left in "Testing" log out every 7 days.)',
    login_failed: 'Couldn’t log in. Check the client ID and secret.',
    login_cancelled: 'Login was cancelled.',
    no_encryption: 'This computer can’t store keys securely, so sync is off.',
    network: 'Check your internet. I’ll try again once you’re back.',
    drive: 'Google Drive said no. I’ll try again in a bit.',
    folder_unavailable: 'Can’t reach the folder. Is the cloud app running and the drive connected?',
    folder_not_writable: 'Can’t write to this folder. Pick another one.'
  },
  syncBrowserOk: 'Connected! You can close this tab.',
  syncBrowserFail: 'Didn’t connect. Go back to the app and try again.',
  settingsAutoHandoff: 'Auto-stop timers on other computers',
  settingsAutoHandoffHint:
    'Start here and the one running elsewhere ends at that moment. Turn off to record on several computers at once (all counted).',
  handoffSentTitle: 'Took over',
  handoffSentBody: (device, category) => `Ended '${category}' on ${device} when you started here.`,
  handoffReceivedTitle: 'Another computer took over',
  handoffReceivedBody: (device, category, time) =>
    `${device} started a timer, so '${category}' here ended at ${time}.`,
  syncFolderTitle: 'Sync with a folder (recommended)',
  syncFolderIntro:
    'Pick a folder that Google Drive for desktop, Dropbox or OneDrive already syncs. No login, no keys.',
  syncFolderFound: 'Found on this computer',
  syncFolderNone:
    'No cloud folder found. Install Google Drive for desktop, or pick a synced folder yourself.',
  syncPickFolder: 'Choose a folder…',
  cloudName: {
    google: 'Google Drive',
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    icloud: 'iCloud Drive'
  },
  syncGoogleAdvanced: 'Connect a Google account (your own key)',
  syncKeyFile: 'Load key file',
  syncKeyDrop: 'Or drop the key file (.json) from Google here',
  syncKeyFileError: {
    not_json: 'That’s not a key file. Pick the .json you got from Google.',
    wrong_type: 'That’s a "Web application" key. Make a "Desktop app" one instead.',
    missing_id: 'No client ID in that key file.'
  },
  syncCode: 'Connection code',
  syncCodePlaceholder: 'JJT1-… code copied from your other computer',
  syncCodeInvalid: 'That code looks off. Copy it again.',
  syncCopyCode: 'Copy code for another computer',
  syncCopied: 'Copied! Paste it into "Connection code" on the other computer.',
  syncCodeHint: 'The code contains your key — keep it between your own computers.',
  syncModeFolder: (path) => `Folder: ${path}`,
  syncModeGoogle: 'Google Drive (your key)',
  updateAvailable: (v) => `Version ${v} is out!`,
  updateGet: 'Get it',
  updateLater: 'Later',
  trayUpdate: (v) => `Get new version (${v})`
}

export const MESSAGES: Record<Locale, Messages> = { ko, en }

/**
 * 언어 결정: 설정이 'auto' 면 시스템 언어(BCP 47, 예 "ko-KR", "en-US")를 본다.
 * 한국어가 아니면 영어 — 지원 언어가 둘뿐이라 그 밖의 언어는 영어가 더 읽기 쉽다.
 */
export function resolveLocale(preference: 'auto' | Locale, systemLanguage: string): Locale {
  if (preference !== 'auto') return preference
  return systemLanguage.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

/** 화면 맨 위 상태 문구: 진행 중 > 준비 > 대기 순. */
export function headline(
  t: Messages,
  active: ActiveSession | null,
  selected: Category | null
): string {
  if (active) return `● ${t.running[active.category]}`
  if (selected) return t.ready[selected]
  return t.idle
}

/** 현재 상태 한 줄 요약. 예: "뇌 키우는 중 🧠 01:23:45", "멍 때리는 중". 트레이 툴팁에 쓴다. */
export function statusText(t: Messages, active: ActiveSession | null, now: number): string {
  if (!active) return t.idle
  return `${t.running[active.category]} ${formatHMS(now - active.startedAt)}`
}
