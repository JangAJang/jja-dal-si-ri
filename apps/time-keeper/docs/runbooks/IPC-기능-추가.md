# 런북: IPC 기능 추가

목적: 화면에서 main 프로세스 기능(파일·OS·상태 변경)을 호출하는 새 API를 하나 추가한다. 예: 기록 초기화, 항상 위 토글.

## 수정할 파일 (순서대로)
1. `src/shared/ipc.ts` — `IPC` 객체에 채널 이름 추가 (`'<영역>:<동작>'`, 예: `window:setAlwaysOnTop`).
2. (타이머 규칙이 바뀌면) `src/shared/timer.ts` — 순수 함수 추가 + `src/shared/timer.test.ts`에 테스트.
3. `src/main/timerService.ts`의 `register()` (타이머 외 기능이면 `src/main/`에 새 서비스 파일을 만들고 `src/main/index.ts`에서 register) — `ipcMain.handle(IPC.<이름>, ...)`. 상태를 바꾸면 반드시 `apply()`를 거쳐 저장·브로드캐스트되게 한다.
4. `src/preload/index.ts` — `api` 객체에 `ipcRenderer.invoke(IPC.<이름>, ...)` 래퍼 추가.
5. `src/preload/index.d.ts` — `TimeKeeperApi`에 같은 시그니처 추가.
6. `src/renderer/src/App.tsx` (또는 해당 화면) — `window.api.<이름>()` 호출.

## 실행
```bash
npm run dev
```

## 검증
- `npm run typecheck && npm test && npm run lint` 통과.
- `npm run dev`로 띄워 기능 동작 확인. 상태를 바꾸는 기능이면 앱을 껐다 켜도 유지되는지 본다.

## 흔한 함정
- `index.ts`의 `api`와 `index.d.ts`의 `TimeKeeperApi`가 어긋나도 컴파일은 통과한다 — 둘을 같이 고친다.
- 렌더러에서 상태를 직접 들고 바꾸지 말 것. 미니 창(#5)과 상태가 갈라진다.
- `src/shared/`에 `electron`이나 `fs`를 import하면 렌더러 빌드가 깨진다.
- `CHANGELOG.md`의 `[Unreleased]`에 한 줄 추가.
