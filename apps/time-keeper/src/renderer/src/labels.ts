import type { Category } from '../../shared/timer'

// TODO(#8): 한/영 전환 시 이 객체를 번역 리소스로 대체한다.
export const CATEGORY_LABEL: Record<Category, string> = {
  work: '일',
  break: '쉼',
  study: '공부'
}
