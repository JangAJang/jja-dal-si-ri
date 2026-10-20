# ttan-jit

화면 모서리에 커서를 올리면 체스·스도쿠 패널이 나타나고, 커서가 벗어나면 사라지는 데스크톱 딴짓 앱 (Electron + React + Vite + TS, 표시 이름 "짜달시리 딴짓").

## 디렉토리 지도
| 경로 | 역할 |
|------|------|
| `src/shared/` | main·renderer 공용 순수 로직 (Electron·Node API import 금지). `hotzone.ts`(핫존·패널 위치, 표시/숨김 상태 전이), `ipc.ts`(채널 이름), `sudoku.ts`(풀이·유일해 생성·싱글 판정), `sudokuGame.ts`(한 판의 조작·되돌리기·시간·저장 검사), `chess.ts`(체스 상태·수 두기·판정·저장 검사 — chess.js 기반), `games.ts`(게임 저장 파일 형식), `settings.ts`(기기별 설정 형식·검증·패널 배율), `labels.ts`(화면 문구) |
| `src/main/` | Electron main 프로세스. `index.ts`(앱 수명·단일 인스턴스·Dock 숨김), `panel.ts`(패널 창의 유일한 주인 — 핫존 폴링·표시/숨김·창 속성), `gameStore.ts`(게임 저장 — 1초 모아 쓰기·종료 시 flush), `settingsService.ts`(설정의 유일한 주인 — 저장·방송), `settingsWindow.ts`(설정 창), `tray.ts`(트레이 켜고 끄기) |
| `src/preload/` | 렌더러에 `window.api` 노출. 타입은 `index.d.ts` |
| `src/renderer/src/` | React 화면. `App.tsx`(게임 탭 패널), `hooks.ts`(`usePanelVisible` — 숨기면 게임 멈춤, `useGames` — 저장된 게임 읽기·저장), `Root.tsx`(URL 해시로 패널/설정 창 고르기·언어 묶음 내려주기), `i18n.ts`(`useT`), `views/SudokuView.tsx`, `views/ChessView.tsx`, `views/SettingsView.tsx`, `chessWorker.ts`(컴퓨터 수 계산 Worker — js-chess-engine), `assets/main.css`(디자인 토큰·전체 스타일) |
| `docs/design.md` | 0.1.0 합의 설계와 기능별 이슈 번호 |
| `electron-builder.yml` | 설치 파일 설정 (appId `com.muhayu.ttanjit`) |

## 명령어 (이 폴더에서)
- 개발 실행: `npm run dev`
- 테스트: `npm test` (vitest — `src/shared/*.test.ts`)
- 타입체크: `npm run typecheck`
- 린트/포맷: `npm run lint` / `npm run format`
- Windows 설치 파일: `npm run build:win` → `dist/ttan-jit-<버전>-setup.exe`
- macOS 설치 파일: `npm run build:mac` (Mac에서만 동작 — 평소엔 릴리스 워크플로가 빌드)
- 릴리스: 루트 `docs/runbooks/앱-버전-릴리스.md` 후 `ttan-jit/v<버전>` 태그 푸시 → `.github/workflows/ttan-jit-release.yml`

## 핵심 규칙 · 하지 말 것
- **설계 기준은 `docs/design.md`.** 결정을 바꾸면 그 문서도 같은 커밋에서 고친다.
- **게임 규칙·스도쿠 생성·핫존 계산은 `src/shared/`의 순수 함수로** 두고 vitest로 테스트한다. 화면·main에 규칙을 따로 쓰지 않는다.
- `src/shared/`에서 Electron·Node API를 import하지 않는다 (렌더러에서도 쓰기 때문).
- **숨김은 즉시다.** 패널을 숨기는 경로에 애니메이션·지연을 넣지 않는다. 숨기면 게임(스도쿠 타이머 포함)이 멈춰야 한다.
- **패널은 포커스를 뺏지 않는다.** 패널을 띄울 때 `show()`가 아니라 `showInactive()`를 쓴다 (#33).
- **패널 표시/숨김은 `src/main/panel.ts`만 한다.** 판정은 `hotzone.ts`의 `nextPanelState`. 렌더러는 `IPC.visibility`로 결과만 받는다.
- 숨김 감지는 main 폴링이다 (숨김 중 50ms, 표시 중 한 틱 ≈ 16ms). 렌더러 `mouseleave`는 포커스 없는 toolwindow에서 오지 않아(Windows 실측) 쓰지 않는다. Windows 타이머 해상도가 15.6ms라 `setTimeout(16)`은 31ms가 된다.
- 창 속성(`type: toolbar`/`panel`, `screen-saver` 층, `setContentProtection`)을 바꾸면 Windows에서 작업표시줄·Alt+Tab·캡처 숨김이 유지되는지 확인한다.
- **체스 엔진·라이브러리는 MIT/BSD 계열만.** GPL(stockfish 등)은 설치 파일에 넣지 않는다 — 레포에 LICENSE가 없다.
- 색은 `main.css` 맨 위 토큰만 쓴다. 다크 모드는 `prefers-color-scheme`으로 토큰만 바꾼다.
- 저장 형식(게임 상태·설정)에는 `version` 필드를 두고, 바꾸면 기존 파일을 읽는 변환 코드를 함께 넣는다.
- **게임 상태는 렌더러가 갖고, main 은 저장만 한다** (`IPC.loadGames`/`saveGames`). 한 판의 조작은 `sudokuGame.ts`의 순수 함수(새 객체 반환)로만 바꾼다.
- **문구는 `src/shared/labels.ts`의 `ko`·`en` 두 묶음에 같이 넣는다.** 화면에 글자를 직접 쓰지 않는다. 렌더러는 `const t = useT()`(`src/renderer/src/i18n.ts`), main(트레이·창 제목)은 `settingsService.messages()`. 두 묶음은 같은 `Messages` 형식이라 한쪽을 빠뜨리면 타입 오류가 나고, `labels.test.ts`가 빈 문구를 잡는다. 영어가 더 길어지니 패널 툴바(344px)에 넣으면 넘치는지 확인한다.
- **설정과 게임 저장은 다른 파일이다.** 설정은 `userData/settings.json`(`settingsService.ts`만 씀), 게임은 `ttan-jit-games.json`. 새 설정 항목은 `src/shared/settings.ts`의 `Settings`·`normalizeSettings`에 넣고, 렌더러는 `window.api.setSettings({ ... })`로 바꾼다. main 쪽 반영은 `onSettingsChange`(패널 `applyPanelSettings`, 트레이).
- **패널 크기는 CSS `zoom`이다** (`.panel`은 360×400 고정, `PANEL_SCALE` 배율). `webContents.setZoomFactor`는 같은 출처의 설정 창까지 바꾸므로 쓰지 않는다. 패널 레이아웃은 기본 크기 기준 px로 짠다.
- **트레이를 꺼도 돌아올 길이 있어야 한다** — 두 번째 실행 → 설정 창(`second-instance`). 이 경로를 없애지 않는다.
- **체스 판은 수 목록(UCI)만 저장하고 `replay()`로 다시 만든다.** 수는 내 수·컴퓨터 수 모두 `applyMove()`로만 둔다. 컴퓨터 수는 Worker에서 계산하고, 요청 당시와 수 개수가 다르면 버린다. 내 수도 고를 때 본 판과 수 개수가 같을 때만 둔다.
- 체스 난이도 → 엔진 설정은 `chess.ts`의 `ENGINE` 하나에서만 바꾼다.
- **실제 마우스를 움직이는 자동 시험(`SetCursorPos` 등)은 하지 않는다.** 사용자가 마우스를 쓰는 중이면 커서가 튀고, 숨은 패널 아래의 다른 창이 클릭된다(#35 때 실제로 일어남). 화면 동작은 `npx electron-vite dev --remoteDebuggingPort 9333`으로 띄우고 CDP `Runtime.evaluate`로 DOM 이벤트를 보내 확인한다. 숨긴 창은 `Page.captureScreenshot`이 멈추니 쓰지 않는다.
- 화면을 눈으로 확인할 때는 화면 공유 숨김 때문에 스크린샷에 패널이 안 찍힌다 — `panel.ts`의 `contentProtection` 기본값을 잠시 `false`로 바꾸고, 커밋 전에 되돌린다.
- 다른 앱(time-keeper 등) 코드를 import하지 않는다. 필요하면 복사한다.

## 더 볼 문서 (필요할 때만)
- 구조·결정 근거: `ARCHITECTURE.md`
- 기능 설계·남은 이슈: `docs/design.md`
- 사람용 안내: `README.md`
