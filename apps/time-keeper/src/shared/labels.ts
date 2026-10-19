import { formatHMS, type ActiveSession, type Category } from './timer'

// 화면·트레이 문구. main 과 renderer 가 함께 쓴다.
// TODO(#8): 한/영 전환 시 이 파일을 번역 리소스로 대체한다.
export const CATEGORY_LABEL: Record<Category, string> = {
  work: '일',
  break: '쉼',
  study: '공부'
}

/** 진행 중 상태 문구. */
export const CATEGORY_RUNNING: Record<Category, string> = {
  work: '일하는 중',
  break: '쉬는 중',
  study: '공부하는 중'
}

export const TEXT = {
  appName: '짜달시리 타이머',
  idle: '대기 중',
  ready: (category: Category): string => `${CATEGORY_LABEL[category]} 준비`,
  start: '시작',
  stop: '종료',
  today: '오늘',
  trayOpen: '열기',
  trayQuit: '종료',
  quitConfirmTitle: '타이머 종료',
  quitConfirmMessage: (category: Category): string =>
    `${CATEGORY_LABEL[category]} 기록이 진행 중입니다.`,
  quitConfirmDetail: '종료하면 기록이 지금 시각으로 끝납니다.',
  quitConfirmOk: '종료',
  quitConfirmCancel: '취소'
}

/** 현재 상태 한 줄 요약. 예: "공부하는 중 01:23:45", "대기 중". 트레이 툴팁에 쓴다. */
export function statusText(active: ActiveSession | null, now: number): string {
  if (!active) return TEXT.idle
  return `${CATEGORY_RUNNING[active.category]} ${formatHMS(now - active.startedAt)}`
}
