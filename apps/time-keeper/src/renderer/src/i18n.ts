import { createContext, useContext } from 'react'
import { ko, type Messages } from '../../shared/labels'

/** 현재 언어의 문구. App 이 설정(resolvedLocale)에 맞춰 값을 넣는다 (#8). */
export const MessagesContext = createContext<Messages>(ko)

export function useT(): Messages {
  return useContext(MessagesContext)
}
