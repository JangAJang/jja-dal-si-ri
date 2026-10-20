// 화면 문구. 화면에 글자를 직접 쓰지 않고 여기서 가져온다. 영어 묶음과 언어 선택은 #37.
export const ko = {
  tabs: { chess: '♟ 체스', sudoku: '9 스도쿠' },
  difficulty: { easy: '쉬움', medium: '보통', hard: '어려움' },
  sudoku: {
    newGame: '새 판',
    confirmNewGame: '진짜 새 판?',
    notes: '메모',
    erase: '지우기',
    undo: '되돌리기',
    solved: '다 풀었다!',
    loading: '판 까는 중…'
  },
  chessPlaceholder: '체스판 자리'
}

export type Messages = typeof ko
