import { SidebarIcon } from './Toolbar'

export interface Heading {
  id: string
  text: string
  level: number
}

interface Props {
  headings: Heading[]
  onSelect: (id: string) => void
  onToggle: () => void
  isMac: boolean
}

/**
 * Full-height table-of-contents sidebar for the current markdown document —
 * spans the whole left edge (own top strip, own bottom), not just the area
 * below the toolbar, so the window has one continuous left column like
 * Arc/Notion rather than a toolbar that stretches across everything.
 */
export default function Sidebar({ headings, onSelect, onToggle, isMac }: Props): JSX.Element {
  const minLevel = Math.min(...headings.map((h) => h.level))

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/60 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      {/* Clears the macOS traffic lights on the left and keeps the window
          draggable from here; same height as the toolbar so the divider
          lines up. The toggle sits at the right edge, next to the border
          with the content pane, so it reads as "close this panel". */}
      <div
        className={`flex h-10 shrink-0 items-center justify-end ${isMac ? 'pl-16' : 'pl-1'} pr-1`}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label="사이드바 닫기"
          title="사이드바 닫기 (⌘B)"
          className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-200/60 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <SidebarIcon active />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto pb-3">
        {headings.map((h, i) => (
          <li key={`${h.id}-${i}`}>
            <button
              type="button"
              onClick={() => onSelect(h.id)}
              title={h.text}
              className="block w-full truncate px-3 py-1 text-left text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
              style={{ paddingLeft: `${0.75 + (h.level - minLevel) * 0.75}rem` }}
            >
              {h.text || '(제목 없음)'}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
