// 화면 문구. 화면에 글자를 직접 쓰지 않고 여기서 가져온다. 영어 묶음과 언어 선택은 #37.
export const ko = {
  tabs: { chess: '♟ 체스', sudoku: '9 스도쿠' },
  difficulty: { easy: '쉬움', medium: '보통', hard: '어려움' },
  newGame: '새 판',
  confirmNewGame: '진짜 새 판?',
  loading: '판 까는 중…',
  openSettings: '설정',
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
  },
  // 트레이·창 제목은 게임처럼 보이지 않게 수수하게 (docs/design.md > 흔적 지우기).
  tray: { settings: '설정', quit: '종료' },
  settings: {
    windowTitle: 'ttan-jit 설정',
    corner: '모서리',
    cornerHint:
      '모니터가 여러 대면 다른 모니터와 안 맞닿은 모서리를 골라. 맞닿은 쪽은 커서가 넘어가서 잘 안 걸려.',
    corners: {
      'top-left': '왼쪽 위',
      'top-right': '오른쪽 위',
      'bottom-left': '왼쪽 아래',
      'bottom-right': '오른쪽 아래'
    },
    dwell: '나타나기까지',
    seconds: (ms: number): string => `${(ms / 1000).toFixed(1)}초`,
    panelSize: '패널 크기',
    sizes: { small: '작게', medium: '보통', large: '크게' },
    showTray: '트레이 아이콘 보이기',
    trayHint: '끄면 앱을 한 번 더 실행해서 이 창을 열 수 있어.',
    contentProtection: '화면 공유·스크린샷에서 숨기기',
    showErrors: '스도쿠 틀린 칸 빨갛게',
    quit: '앱 종료'
  }
}

export type Messages = typeof ko
