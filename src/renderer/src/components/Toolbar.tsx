interface Props {
  title: string
  dark: boolean
  isMac: boolean
  onToggleTheme: () => void
  showSidebarToggle: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

function SidebarIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="2.5" width="5" height="11" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

/**
 * Thin draggable strip: sidebar toggle, current file name, plus a
 * light/dark toggle. File opening lives in the native menu (File → Open).
 */
export default function Toolbar({
  title,
  dark,
  isMac,
  onToggleTheme,
  showSidebarToggle,
  sidebarOpen,
  onToggleSidebar
}: Props): JSX.Element {
  return (
    <header
      className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-2 dark:border-zinc-800"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* keep the macOS traffic lights clear */}
      <div className={`flex shrink-0 items-center ${isMac ? 'pl-16' : 'pl-1'}`}>
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
            title={sidebarOpen ? '사이드바 닫기 (⌘B)' : '사이드바 열기 (⌘B)'}
            className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <SidebarIcon active={sidebarOpen} />
          </button>
        )}
      </div>

      <div className="flex-1 truncate text-center text-xs text-zinc-400 dark:text-zinc-500">
        {title}
      </div>

      <div
        className="w-16 shrink-0 text-right"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          title={dark ? '라이트 모드 (⌘⇧L)' : '다크 모드 (⌘⇧L)'}
          className="rounded p-1.5 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {dark ? '☀' : '☾'}
        </button>
      </div>
    </header>
  )
}
