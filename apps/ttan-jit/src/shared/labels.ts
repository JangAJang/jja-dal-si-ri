// 화면 문구. 화면에 글자를 직접 쓰지 않고 여기서 가져온다. 영어 묶음과 언어 선택은 #37.
export const ko = {
  tabs: { chess: '♟ 체스', sudoku: '9 스도쿠' },
  difficulty: { easy: '쉬움', medium: '보통', hard: '어려움' },
  newGame: '새 판',
  confirmNewGame: '진짜 새 판?',
  loading: '판 까는 중…',
  sudoku: {
    notes: '메모',
    erase: '지우기',
    undo: '되돌리기',
    solved: '다 풀었다!'
  },
  chess: {
    side: { w: '백', b: '흑', random: '무작위' },
    yourTurn: '네 차례',
    thinking: '생각 중…',
    check: '체크!',
    win: '이겼다!',
    lose: '졌다…',
    draw: '무승부'
  }
}

export type Messages = typeof ko
