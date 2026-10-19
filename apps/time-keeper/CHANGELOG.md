# Changelog — time-keeper

이 앱의 모든 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/), 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.

- 첫째 자리(MAJOR): 사용법이 바뀌거나 데이터가 호환되지 않는 변경
- 둘째 자리(MINOR): 기능 추가
- 셋째 자리(PATCH): 버그 수정·자잘한 손질

항목 분류: `Added`(추가) · `Changed`(변경) · `Deprecated`(곧 제거) · `Removed`(제거) · `Fixed`(버그 수정) · `Security`(보안)

## [Unreleased]
### Added
- 앱 생성: Electron + React + Vite + TS 뼈대, Windows(.exe)·macOS(.dmg) 설치 파일 설정 (#2)
- 일·쉼·공부 시작 버튼과 종료 버튼. 다른 분야를 시작하면 진행 중인 기록이 자동으로 끝나고 전환 (#2)
- 경과 시간 시:분:초 표시, 오늘 분야별 합계 (#2)
- 기록을 내 컴퓨터에 저장. 앱 종료·절전 시 그 시각으로 기록 마감, 비정상 종료 시 마지막 확인 시각으로 마감 (#2)
- `time-keeper/v*` 태그로 설치 파일을 빌드해 GitHub Releases에 올리는 워크플로 (#2)
