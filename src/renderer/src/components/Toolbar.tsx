interface Props {
  title: string
  dark: boolean
  isMac: boolean
  onToggleTheme: () => void
}

/**
 * Thin draggable strip: current file name, plus a light/dark toggle.
 * File opening lives in the native menu (File → Open).
 */
export default function Toolbar({ title, dark, isMac, onToggleTheme }: Props): JSX.Element {
  return (
    <header
      className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-2 dark:border-zinc-800"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* keep the macOS traffic lights clear */}
      <div className={isMac ? 'w-16 shrink-0' : 'w-8 shrink-0'} />

      <div className="flex-1 truncate text-center text-xs text-zinc-400 dark:text-zinc-500">
        {title}
      </div>

      <div className="w-16 shrink-0 text-right" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
