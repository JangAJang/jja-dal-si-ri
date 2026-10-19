import type { Period } from './stats'
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
  languageName: { auto: '시스템 따라가기', ko: '한국어', en: 'English' },

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
  quitConfirmCancel: '아 맞다, 더 할게'
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
  languageName: { auto: 'Follow system', ko: '한국어', en: 'English' },

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
  quitConfirmCancel: 'Oh right, keep going'
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
