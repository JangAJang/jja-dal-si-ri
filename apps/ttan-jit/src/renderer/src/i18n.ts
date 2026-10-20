import { createContext, useContext } from 'react'
import { ko, type Messages } from '../../shared/labels'

/** 현재 언어의 문구. Root.tsx 가 설정의 locale 에 맞춰 값을 넣는다 (#37). */
export const MessagesContext = createContext<Messages>(ko)

export function useT(): Messages {
  return useContext(MessagesContext)
}
