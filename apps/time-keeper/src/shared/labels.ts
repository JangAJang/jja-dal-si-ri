import type { Period } from './stats'
import { formatHMS, type ActiveSession, type Category } from './timer'

// 화면·트레이 문구. main 과 renderer 가 함께 쓴다.
// 톤: 능청스러운 반말 (#14, 사용자 확정). 문구를 바꿀 때 톤을 맞춘다.
// TODO(#8): 한/영 전환 시 이 파일을 번역 리소스로 대체한다.

/** 분야 버튼·오늘 합계에 쓰는 짧은 이름. */
export const CATEGORY_LABEL: Record<Category, string> = {
  work: '일',
  break: '쉼',
  study: '공부'
}

/** 분야를 골랐지만 아직 [시작] 전. */
export const CATEGORY_READY: Record<Category, string> = {
  work: '돈...벌어야겠지?',
  break: '숨고르기',
  study: '이제 진짜 공부뿐이야'
}

/** 진행 중 상태. */
export const CATEGORY_RUNNING: Record<Category, string> = {
  work: '돈 버는 중 💸',
  break: '충전 중 🔋',
  study: '뇌 키우는 중 🧠'
}

/** 종료 확인창 첫 줄. */
const QUIT_INTERRUPT: Record<Category, string> = {
  work: '잠깐, 돈 벌던 중이잖아!',
  break: '잠깐, 충전하던 중이잖아!',
  study: '잠깐, 뇌 키우던 중이잖아!'
}

/** Date.getDay() 순서 (일요일 = 0). */
export const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export const PERIOD_LABEL: Record<Period, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
  custom: '직접'
}

export const TEXT = {
  appName: '짜달시리 타이머',
  idle: '멍 때리는 중',
  start: '가보자고',
  stop: '그만!',
  today: '오늘의 성적표',
  trayOpen: '나와봐',
  trayQuit: '오늘은 여기까지',
  // 미니 모드 (#5)
  toDigital: '쪼그맣게 (숫자)',
  toAnalog: '쪼그맣게 (시계)',
  pinOn: '맨 위에 박제',
  pinOff: '박제 풀기',
  miniHint: '더블클릭하면 다시 커져',
  expand: '다시 크게',
  nextUp: (ready: string): string => `다음: ${ready}`,
  startShort: '▶',
  stopShort: '■',
  // 통계 (#6)
  tabTimer: '타이머',
  tabStats: '통계',
  statsTotal: '합계',
  statsEmpty: '이 기간엔 기록이 없어. 가보자고!',
  statsDaily: '날마다',
  statsTooLong: '두 달이 넘는 기간은 합계만 보여줘',
  customFrom: '부터',
  customTo: '까지',
  hours: (h: number): string => `${h}시간`,
  dayTitle: (t: number): string => {
    const d = new Date(t)
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`
  },
  quitConfirmTitle: '진짜 끌 거야?',
  quitConfirmMessage: (category: Category): string => QUIT_INTERRUPT[category],
  quitConfirmDetail: '끄면 지금까지만 기록돼.',
  quitConfirmOk: '그래도 끌래',
  quitConfirmCancel: '아 맞다, 더 할게'
}

/** 화면 맨 위 상태 문구: 진행 중 > 준비 > 대기 순. */
export function headline(active: ActiveSession | null, selected: Category | null): string {
  if (active) return `● ${CATEGORY_RUNNING[active.category]}`
  if (selected) return CATEGORY_READY[selected]
  return TEXT.idle
}

/** 현재 상태 한 줄 요약. 예: "뇌 키우는 중 🧠 01:23:45", "멍 때리는 중". 트레이 툴팁에 쓴다. */
export function statusText(active: ActiveSession | null, now: number): string {
  if (!active) return TEXT.idle
  return `${CATEGORY_RUNNING[active.category]} ${formatHMS(now - active.startedAt)}`
}
