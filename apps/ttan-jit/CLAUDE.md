# ttan-jit

화면 모서리에 커서를 올리면 체스·스도쿠 패널이 나타나고, 커서가 벗어나면 사라지는 데스크톱 딴짓 앱 (Electron + React + Vite + TS, 표시 이름 "짜달시리 딴짓").

## 디렉토리 지도
| 경로 | 역할 |
|------|------|
| `src/shared/` | main·renderer 공용 순수 로직 (Electron·Node API import 금지). 게임 규칙·생성기·설정 형식이 여기 온다 |
| `src/main/` | Electron main 프로세스. `index.ts`(앱 수명·단일 인스턴스·패널 창) |
| `src/preload/` | 렌더러에 `window.api` 노출. 타입은 `index.d.ts` |
| `src/renderer/src/` | React 화면. `App.tsx`(게임 탭 패널), `assets/main.css`(디자인 토큰·전체 스타일) |
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
- **체스 엔진·라이브러리는 MIT/BSD 계열만.** GPL(stockfish 등)은 설치 파일에 넣지 않는다 — 레포에 LICENSE가 없다.
- 색은 `main.css` 맨 위 토큰만 쓴다. 다크 모드는 `prefers-color-scheme`으로 토큰만 바꾼다.
- 저장 형식(게임 상태·설정)에는 `version` 필드를 두고, 바꾸면 기존 파일을 읽는 변환 코드를 함께 넣는다.
- 다른 앱(time-keeper 등) 코드를 import하지 않는다. 필요하면 복사한다.

## 더 볼 문서 (필요할 때만)
- 구조·결정 근거: `ARCHITECTURE.md`
- 기능 설계·남은 이슈: `docs/design.md`
- 사람용 안내: `README.md`
