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

- [ ] 사이드바 목차(TOC) · 최근 파일
- [ ] 코드 하이라이트를 Shiki 로 교체 (VS Code 테마 정확도)
- [ ] 인쇄 / PDF 내보내기
- [ ] electron-updater 자동 업데이트 (GitHub Releases)
- [ ] 앱 아이콘
