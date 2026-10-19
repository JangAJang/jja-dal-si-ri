# 런북: 작업 브랜치 생성과 PR

목적: 이슈 하나를 브랜치에서 작업하고 PR로 `main`에 합친다. 이 레포의 모든 변경은 이 절차를 따른다.

## 수정할 파일 (순서대로)
1. GitHub 이슈 — 작업할 이슈가 없으면 먼저 만든다. 제목에 앱 이름을 넣는다 (예: `[snack-request] 주문 폼 추가`).
   ```bash
   gh issue create --title "[<앱이름>] <제목>" --body "<할 일>"
   ```
2. 브랜치 — 최신 `main`에서 규칙대로 만든다 (`CLAUDE.md > GitHub 작업 규칙`).
   ```bash
   git switch main && git pull
   git switch -c leejanghee/<type>/<앱이름>/<이슈번호>/<작업-제목>
   ```
3. `apps/<앱이름>/...` — 코드 수정. 그 앱 폴더 밖(다른 앱)은 건드리지 않는다.
4. `apps/<앱이름>/CHANGELOG.md` — `[Unreleased]`에 변경 한 줄을 추가한다 (`docs`/`chore`로 앱 동작이 안 바뀌면 생략 가능).
5. 커밋 — `<type>(<앱이름>): <한 줄 요약> (#<이슈번호>)`

## 실행
```bash
git push -u origin HEAD
gh pr create --base main \
  --title "<type>(<앱이름>): <한 줄 요약> (#<이슈번호>)" \
  --body "Closes #<이슈번호>"
```

## 검증
- `git branch --show-current`가 `leejanghee/<type>/<앱이름>/<이슈번호>/<작업-제목>` 형식이다.
- `git diff --name-only main...HEAD`의 경로가 모두 `apps/<앱이름>/` 아래다 (앱이름이 `repo`면 `apps/` 밖이다).
- PR 본문에 `Closes #<이슈번호>`가 있어 머지 시 이슈가 닫힌다.

## 흔한 함정
- `main`에서 바로 작업을 시작하는 실수 — 커밋 전에 현재 브랜치를 확인한다.
- 이슈 번호에 `#`을 붙이면 셸에서 주석으로 해석될 수 있다 — 브랜치 이름에는 숫자만 쓴다.
- 브랜치의 `<type>`과 커밋 메시지의 `<type>`이 다르면 리뷰 때 혼란스럽다 — 맞춘다.
