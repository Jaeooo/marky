interface Props {
  title: string
}

/**
 * Thin draggable strip. Keeps the macOS traffic-light inset clear and shows the
 * current file name. No controls — everything lives in the native menu bar.
 */
export default function Toolbar({ title }: Props): JSX.Element {
  return (
    <header
      className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="w-16 shrink-0" />
      <div className="flex-1 truncate text-center text-xs text-zinc-400 dark:text-zinc-500">
        {title}
      </div>
      <div className="w-16 shrink-0" />
    </header>
  )
}
