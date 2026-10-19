# time-keeper

일·쉼·공부 시간을 기록하고 분야별 통계를 보는 데스크톱 타이머 (Electron + React + Vite + TS, 표시 이름 "짜달시리 타이머").

## 디렉토리 지도
| 경로 | 역할 |
|------|------|
| `src/shared/` | main·renderer 공용 순수 로직. `timer.ts`(타이머 규칙·집계), `labels.ts`(한/영 문구 묶음 `ko`·`en`, 언어 결정), `ipc.ts`(채널 이름), `view.ts`(창 종류 main/digital/analog), `stats.ts`(기간·일별 집계), `settings.ts`(기기별 설정 형식·검증), `theme.ts`(본체 색 → 테두리·글자색) |
| `src/main/` | Electron main 프로세스. `index.ts`(앱 수명·단일 인스턴스·종료 흐름), `windows.ts`(기본·미니 창 생성/전환·항상 위·미니 드래그), `timerService.ts`(타이머 상태의 유일한 소유자), `tray.ts`(트레이), `store.ts`(로컬 JSON 저장), `settingsService.ts`(기기별 설정 저장·방송) |
| `src/preload/` | 렌더러에 `window.api` 노출. 타입은 `index.d.ts` |
| `src/renderer/src/` | React 화면. `App.tsx`(URL 해시로 화면 고르기), `views/`(MainView·StatsView·SettingsView·DigitalMini·AnalogMini), `components/`(Lcd·TimerControls·Icons), `hooks.ts`(상태 구독·준비 선택·미니 드래그), `assets/main.css`(디자인 토큰·전체 스타일), `assets/fonts/`(DSEG7 LCD 글꼴, OFL) |
| `docs/design.md` | 0.1.0 합의 설계와 기능별 이슈 번호 |
| `docs/runbooks/` | 반복 작업 절차 |
| `electron-builder.yml` | 설치 파일 설정 (appId `com.muhayu.timekeeper`) |

## 명령어 (이 폴더에서)
- 개발 실행: `npm run dev`
- 테스트: `npm test` (vitest — `src/shared/*.test.ts`)
- 타입체크: `npm run typecheck`
- 린트/포맷: `npm run lint` / `npm run format`
- Windows 설치 파일: `npm run build:win` → `dist/time-keeper-<버전>-setup.exe`
- macOS 설치 파일: `npm run build:mac` (Mac에서만 동작 — 평소엔 릴리스 워크플로가 빌드)
- 릴리스: 루트 `docs/runbooks/앱-버전-릴리스.md` 후 `time-keeper/v<버전>` 태그 푸시 → `.github/workflows/time-keeper-release.yml`

## 핵심 규칙 · 하지 말 것
- **타이머 규칙은 `src/shared/timer.ts`의 순수 함수로만 바꾼다.** main·renderer에 시간 계산을 따로 쓰지 않는다. 바꾸면 `timer.test.ts`도 함께 고친다.
- **상태 변경은 `TimerService`를 통해서만.** 렌더러는 IPC로 요청하고 `IPC.changed` 브로드캐스트로 받는다 (창이 여럿이어도 상태가 하나).
- 경과 시간은 `now - startedAt`으로 계산한다. 1초마다 더하는 카운터를 만들지 않는다.
- **시각은 epoch ms(UTC 기준 절대 시각)로만 저장한다.** 날짜·시간대 문자열을 저장하지 않는다. 날짜 나누기(오늘·이번 주·이번 달·일별)는 보는 기기의 현지 시간대로, `src/shared/stats.ts`·`timer.ts`의 함수만 쓴다.
- **날짜를 옮길 때 `24 * 60 * 60 * 1000`을 더하지 않는다** — 서머타임 날은 23·25시간이다. `nextDay()`(setDate) / `setMonth`를 쓴다. 날짜 계산을 바꾸면 `calendar.test.ts`(여러 시간대·윤년·서머타임)가 통과해야 한다.
- `src/shared/`에서 Electron·Node API를 import하지 않는다 (렌더러에서도 쓰기 때문).
- 저장 형식(`StoreData`, `version: 1`)을 바꾸면 기존 사용자 파일을 읽는 변환 코드를 함께 넣는다.
- 구글 OAuth 키를 코드·설정 파일·워크플로에 넣지 않는다 — 사용자가 앱에서 직접 입력한다 (`docs/design.md`).
- **문구는 `src/shared/labels.ts`의 `ko`·`en` 두 묶음에 같이 넣는다** (#8). 화면에 글자를 직접 쓰지 않는다. 렌더러는 `const t = useT()`(`src/renderer/src/i18n.ts`), main(트레이·대화상자·창 제목)은 `settingsService.messages`. 두 묶음은 같은 `Messages` 형식이라 한쪽을 빠뜨리면 타입 오류가 난다. 톤은 두 언어 모두 능청스러운 반말(`docs/design.md > 문구 톤`). 영어는 더 길어지니 버튼에 넣으면 화면에서 잘리는지 확인한다.
- **종료는 `requestQuit()`(`src/main/index.ts`)을 거친다.** 기록 진행 중이면 확인창을 띄운다. `app.quit()`을 직접 부르는 새 경로를 만들지 않는다 — 부르면 `before-quit`이 다시 확인창으로 돌린다.
- 창 닫기(X)는 숨기기다. 창을 실제로 닫으려면 `markQuitting()` 이후여야 한다 (`src/main/windows.ts`).
- **창은 `openView(mode)`로만 띄운다.** 한 번에 하나의 창만 보이게 하는 규칙이 거기 있다. 새 창 종류는 `SPECS`와 `src/shared/view.ts`에 추가한다.
- 미니 창에 CSS `-webkit-app-region: drag`를 쓰지 않는다 — Windows에서 더블클릭을 삼킨다. 드래그는 `useMiniWindow()`(IPC `window:dragStart/End`)로 한다.
- **설정과 기록은 다른 파일이다.** 설정(본체 색·성적표 접힘·언어)은 기기별 `userData/settings.json`, 기록은 `time-keeper-data.json`(동기화 대상). 새 설정 항목은 `src/shared/settings.ts`의 `Settings`·`normalizeSettings`에 추가하고 `window.api.setSettings({ ... })`로 바꾼다.
- **본체 색은 사용자가 바꾼다.** `--shell`·`--ink` 등은 `App.tsx`가 `shellTokens()`로 덮어쓴다. 늘 밝은 면(키·패널·선택된 탭·다이얼 판) 위 글자는 `--panel-ink`를 써야 어두운 본체에서도 보인다 — 새 밝은 면을 만들면 `main.css` 맨 아래 "본체 색과 무관한 밝은 면" 목록에 넣는다.
- **디자인은 레트로 주방 타이머**(`docs/design.md > 디자인`). 색·크기는 `main.css` 맨 위 토큰을 쓰고 새 색을 즉석에서 만들지 않는다. 분야 색은 `.cat-*`의 `--cat`/`--cat-edge`.

## 더 볼 문서 (필요할 때만)
- 구조·데이터 흐름·결정 근거: `ARCHITECTURE.md`
- 기능 설계·남은 이슈: `docs/design.md`
- 반복 작업: `docs/runbooks/`
- 사람용 안내: `README.md`
