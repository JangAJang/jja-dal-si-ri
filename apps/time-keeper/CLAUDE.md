# time-keeper

일·쉼·공부 시간을 기록하고 분야별 통계를 보는 데스크톱 타이머 (Electron + React + Vite + TS, 표시 이름 "짜달시리 타이머").

## 디렉토리 지도
| 경로 | 역할 |
|------|------|
| `src/shared/` | main·renderer 공용 순수 로직. `timer.ts`(타이머 규칙·집계), `ipc.ts`(채널 이름) |
| `src/main/` | Electron main 프로세스. `timerService.ts`가 타이머 상태의 유일한 소유자, `store.ts`가 로컬 JSON 저장 |
| `src/preload/` | 렌더러에 `window.api` 노출. 타입은 `index.d.ts` |
| `src/renderer/src/` | React 화면. `App.tsx`(타이머 화면), `labels.ts`(분야 표시명) |
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
- `src/shared/`에서 Electron·Node API를 import하지 않는다 (렌더러에서도 쓰기 때문).
- 저장 형식(`StoreData`, `version: 1`)을 바꾸면 기존 사용자 파일을 읽는 변환 코드를 함께 넣는다.
- 구글 OAuth 키를 코드·설정 파일·워크플로에 넣지 않는다 — 사용자가 앱에서 직접 입력한다 (`docs/design.md`).
- 화면 문구는 `labels.ts` 등 한곳에 모은다 (#8에서 한/영 리소스로 교체 예정).

## 더 볼 문서 (필요할 때만)
- 구조·데이터 흐름·결정 근거: `ARCHITECTURE.md`
- 기능 설계·남은 이슈: `docs/design.md`
- 반복 작업: `docs/runbooks/`
- 사람용 안내: `README.md`
