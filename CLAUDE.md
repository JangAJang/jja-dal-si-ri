# jja-dal-si-ri

일상과 업무에서 쓰는 짜달시리한(자잘한) 애플리케이션들을 `apps/<앱이름>/` 단위로 모아두는 모노레포.

## 디렉토리 지도
| 경로 | 역할 |
|------|------|
| `apps/<앱이름>/` | 앱 하나. 자체 `README.md`·`CLAUDE.md`·`CHANGELOG.md`·`docker-compose.yaml`을 가진 독립 프로젝트 |
| `docs/runbooks/` | 레포 단위 반복 작업 절차 (작업 브랜치·PR, 앱 추가, 버전 릴리스) |
| `docs/templates/app/` | 새 앱에 복사하는 파일 템플릿 (`CHANGELOG.md`) |
| `README.md` | 사람용 앱 목록 표 (버전·상태·주소) |

앱 안에서 작업할 때는 **그 앱의 `CLAUDE.md`를 먼저 읽는다.** 루트 문서는 레포 규칙만 다룬다.

## 명령어
루트에는 빌드 대상이 없다. 모든 명령은 앱 폴더 안에서 실행한다.
- 로컬 스택 기동: `cd apps/<앱이름> && docker compose up`
- 이미지 빌드: `cd apps/<앱이름> && docker compose build`
- 앱별 빌드/테스트/린트: `apps/<앱이름>/CLAUDE.md` 참조
- 새 앱 뼈대 생성: 빈 `apps/<앱이름>/` 안에서 `create-claude-app` 스킬 실행

## 핵심 규칙 · 하지 말 것
- **앱 하나 = `apps/` 아래 폴더 하나.** 앱 이름은 영문 소문자 kebab-case (`snack-request`).
- **앱끼리 코드를 공유하지 않는다.** 다른 앱을 import·참조하지 말고, 루트에 공용 모듈(`shared/`, `common/`, `libs/`)을 만들지 않는다. 같은 코드가 필요하면 복사한다.
- **스택은 `create-claude-app` 프리셋 안에서만 고른다** (Java/Spring · Python, React+Vite+TS, MariaDB). 실행 경로는 앱마다 `docker compose up` 하나.
- **버전은 앱별 SemVer.** 기준 문서는 `apps/<앱이름>/CHANGELOG.md` (Keep a Changelog 형식). 새 앱은 `0.1.0`에서 시작.
- **앱 코드를 바꾸면 같은 커밋에서 그 앱 `CHANGELOG.md`의 `[Unreleased]`에 항목을 추가한다.**
- **버전을 올리는 커밋에서는 세 군데를 함께 고친다**: 앱 `CHANGELOG.md`, 루트 `README.md` 앱 목록 표, 앱 매니페스트 버전 필드(`build.gradle`의 `version` / `package.json` / `pyproject.toml`). 절차는 `docs/runbooks/앱-버전-릴리스.md`.
- git 태그는 `<앱이름>/v<버전>` (예: `snack-request/v1.2.0`).
- **호스트 포트는 앱마다 고유하게 배정한다.** 배정 규칙은 `ARCHITECTURE.md > 포트 배정`, 실제 배정 내역은 루트 `README.md` 표의 주소 칸.
- `.env`는 커밋하지 않는다. `.env.example`만 커밋한다.

## GitHub 작업 규칙
- **이 레포의 GitHub 작업은 `JangAJang` 계정으로 한다.** 전역 `gh` 활성 계정(`leejanghee-muhayu`)은 바꾸지 않는다 — `gh auth switch` 금지.
  - `gh`: SessionStart 훅(`.claude/settings.local.json`)이 `GH_TOKEN`을 JangAJang 토큰으로 설정한다. `gh api user -q .login`이 `JangAJang`이 아니면 명령 앞에 `GH_TOKEN=$(gh auth token --user JangAJang)`를 붙인다.
  - `git push`: 레포 로컬 git config의 credential helper가 JangAJang 토큰을 쓴다.
- **`main`에 직접 커밋·푸시하지 않는다.** 모든 작업은 이슈 → 브랜치 → PR → `main` 머지 순서로 한다. 절차는 `docs/runbooks/작업-브랜치-PR.md`.
- **브랜치 이름**: `leejanghee/<type>/<앱이름>/<이슈번호>/<작업-제목>`
  - 예: `leejanghee/feat/snack-request/12/add-order-form`
  - `<type>`: `feat`(기능 추가) · `modify`(기존 기능 변경) · `fix`(버그 수정) · `refactor`(동작 변화 없는 구조 개선) · `docs`(문서만) · `chore`(설정·빌드·의존성) · `release`(버전 릴리스)
  - `<앱이름>`: `apps/` 폴더 이름 그대로. 루트 문서·규칙처럼 특정 앱이 아닌 작업은 `repo`.
  - `<이슈번호>`: GitHub 이슈 번호 숫자만 (`#` 없이). 이슈가 없으면 먼저 만든다.
  - `<작업-제목>`: 영문 소문자 kebab-case, 짧게.
- **브랜치 하나 = 이슈 하나 = 앱 하나.** 한 브랜치에서 여러 앱을 고치지 않는다.
- **커밋 메시지**: `<type>(<앱이름>): <한 줄 요약> (#<이슈번호>)` — 예: `feat(snack-request): 주문 폼 추가 (#12)`. `<type>`·`<앱이름>`은 브랜치와 같게.
- **PR**: base는 `main`, 제목은 커밋 메시지 형식과 같게, 본문에 `Closes #<이슈번호>`와 `CHANGELOG.md` 반영 여부를 적는다.
- 릴리스 태그(`<앱이름>/vx.y.z`)는 릴리스 PR이 `main`에 머지된 **뒤** `main`에서 붙인다.

## 더 볼 문서 (필요할 때만)
- 레포 구조/결정 근거/포트 배정: `ARCHITECTURE.md`
- 반복 작업 절차: `docs/runbooks/`
- 용어: `GLOSSARY.md`
- 사람용 안내·앱 목록: `README.md`
