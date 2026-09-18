export interface Heading {
  id: string
  text: string
  level: number
}

interface Props {
  headings: Heading[]
  onSelect: (id: string) => void
}

/** Collapsible table-of-contents for the current markdown document. */
export default function Sidebar({ headings, onSelect }: Props): JSX.Element {
  const minLevel = Math.min(...headings.map((h) => h.level))

  return (
    <nav className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50/60 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <ul>
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
