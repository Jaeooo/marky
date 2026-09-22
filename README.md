# Marky

깔끔한 마크다운 뷰어. macOS · Windows 데스크톱 앱.

## 스택

| 영역 | 사용 |
| --- | --- |
| 셸 | Electron 33 |
| 빌드 | electron-vite (main / preload / renderer) |
| 패키징 | electron-builder — mac `dmg`+`zip` (arm64·x64), win `nsis` (x64) |
| UI | React 18 + TypeScript + Vite |
| 앱 크롬 | HeroUI (`@heroui/react`) + Tailwind CSS 3 |
| 본문 렌더 | react-markdown + `@tailwindcss/typography` (`prose`) |
| 확장 | remark-gfm, remark-math + rehype-katex, rehype-highlight, rehype-slug/autolink, mermaid |
| 파일 감시 | chokidar (저장 시 자동 새로고침) |

## 개발

```bash
npm install
npm run dev          # 핫 리로드로 앱 실행
```

`SAMPLE.md`를 창에 끌어다 놓으면 렌더 결과를 바로 확인할 수 있다.

## 빌드

```bash
npm run build:mac    # dist/ 에 dmg + zip
npm run build:win    # dist/ 에 nsis 설치 파일
```

> 아이콘: `build/icon.icns` (mac), `build/icon.ico` (win), `build/icon.png` (1024²) 를
> 넣으면 electron-builder 가 자동으로 사용한다. 없으면 Electron 기본 아이콘.

## 릴리스 (자동 업데이트)

자동 업데이트는 GitHub Releases 피드를 쓴다. 공개 저장소여야 앱에 토큰 없이
업데이트를 내려받을 수 있다.

```bash
# package.json 의 version 을 올린 뒤
GH_TOKEN=$(gh auth token) npm run release:mac
GH_TOKEN=$(gh auth token) npm run release:win
```

`dmg`/`zip`/`nsis` 산출물과 `latest-mac.yml`·`latest.yml` 피드가 해당 버전의
릴리스에 올라간다. 앱은 실행 4초 뒤 조용히 확인하고, 새 버전이 있으면
백그라운드로 받은 다음 "지금 다시 시작" 여부를 묻는다. 메뉴의
`Marky → 업데이트 확인…`(Windows 는 `Help`)으로 직접 확인할 수도 있다.
개발 빌드(`npm run dev`)에서는 확인하지 않는다.

macOS 자동 업데이트는 코드 서명이 필요하다. 현재는 Apple Development
인증서로 서명하므로 서명 주체가 같은 내 기기에서는 교체가 되지만, 다른 사람에게
배포하려면 Developer ID Application 인증서와 공증(notarization)이 필요하다.

## 구조

```
src/
  main/       Electron 메인 — 창, 파일 열기 다이얼로그, 파일 감시, 파일 연결
  preload/    contextBridge 로 노출하는 안전한 API (window.marky)
  renderer/   React 뷰어 UI
    src/components/  Toolbar, EmptyState, MarkdownView, Mermaid
    src/styles/      Tailwind + KaTeX + highlight.js
```

## 품질

```bash
npm run typecheck
npm run lint
npm run format
```

## 로드맵

- [x] 최근 파일 (홈 화면, 클릭해서 열기)
- [x] 멀티 윈도우 (⌘N)
- [x] 앱 아이콘
- [x] PDF 뷰어 (자체 렌더링, ⌘N/드래그앤드롭/Finder 연결 지원)
- [x] HTML 뷰어 (읽기 전용 — 스크립트 실행 차단, 원격 리소스 차단, 로컬 상대경로 리소스만 허용)
- [x] 사이드바 목차(TOC) — 마크다운 헤딩 자동 추출, ⌘B로 토글
- [ ] 문서 내 검색 (⌘F)
- [ ] 코드 하이라이트를 Shiki 로 교체 (VS Code 테마 정확도)
- [ ] 인쇄 / PDF 내보내기
- [x] electron-updater 자동 업데이트 (GitHub Releases)
