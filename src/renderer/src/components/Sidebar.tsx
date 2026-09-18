import { useCallback, useEffect, useRef } from 'react'
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
  width: number
  onWidthChange: (width: number) => void
}

export const MIN_SIDEBAR_WIDTH = 180
export const MAX_SIDEBAR_WIDTH = 480

/**
 * Full-height table-of-contents sidebar for the current markdown document —
 * spans the whole left edge (own top strip, own bottom), not just the area
 * below the toolbar, so the window has one continuous left column like
 * Arc/Notion rather than a toolbar that stretches across everything.
 */
export default function Sidebar({
  headings,
  onSelect,
  onToggle,
  isMac,
  width,
  onWidthChange
}: Props): JSX.Element {
  const minLevel = Math.min(...headings.map((h) => h.level))
  const draggingRef = useRef(false)

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!draggingRef.current) return
      onWidthChange(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX)))
    }
    const onMouseUp = (): void => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onWidthChange])

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  return (
    <nav
      className="relative flex h-full shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/60 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
      style={{ width }}
    >
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

      {/* Drag handle: centered on the border, grabbable a couple px either
          side of it. Needs no-drag since it overlaps the draggable strip. */}
      <div
        onMouseDown={startResize}
        className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="mx-auto h-full w-px bg-transparent transition hover:bg-indigo-400/60 active:bg-indigo-400" />
      </div>
    </nav>
  )
}
