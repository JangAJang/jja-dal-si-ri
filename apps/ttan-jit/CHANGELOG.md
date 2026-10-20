# Changelog — ttan-jit

이 앱의 모든 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/), 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.

- 첫째 자리(MAJOR): 사용법이 바뀌거나 데이터가 호환되지 않는 변경
- 둘째 자리(MINOR): 기능 추가
- 셋째 자리(PATCH): 버그 수정·자잘한 손질

항목 분류: `Added`(추가) · `Changed`(변경) · `Deprecated`(곧 제거) · `Removed`(제거) · `Fixed`(버그 수정) · `Security`(보안)

## [Unreleased]
### Added
- 앱 생성: Electron + React + Vite + TS 뼈대, 체스/스도쿠 탭 자리만 있는 패널 창, 단일 인스턴스, Windows(.exe)·macOS(.dmg) 설치 파일 설정 (#32)
- 화면 모서리(기본 오른쪽 위)에 커서를 0.5초 올려 두면 패널이 나타나고, 패널을 벗어나면 바로(약 16ms) 사라짐. 포커스를 뺏지 않음 (#33)
- 작업표시줄·Dock·Alt+Tab 에 나타나지 않고, 항상 위·화면 공유/스크린샷에서 패널 숨김 (#33)
