import { useEffect, useMemo, useState } from 'react'
import type { RecentEntry } from '../../../preload'

const openHint = navigator.platform.toLowerCase().includes('mac') ? '⌘O' : 'Ctrl+O'

/** The app mark from design/icon.svg, monochrome so it inherits the text colour. */
function Mark(): JSX.Element {
  return (
    <svg width="30" height="30" viewBox="0 0 1024 1024" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M 353 742 A 335 335 0 0 1 671 282 A 335 335 0 0 1 353 742 Z M 353 742 A 545 545 0 0 1 671 282 A 545 545 0 0 1 353 742 Z"
      />
    </svg>
  )
}

function relTime(ts: number, now: number): string {
  const m = Math.floor((now - ts) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

function kind(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'PDF'
  if (ext === 'html' || ext === 'htm') return 'HTML'
  return 'MD'
}

/** Parent folder name, shown only to tell same-named files apart. */
function folder(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 2] ?? ''
}

export default function EmptyState(): JSX.Element {
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    void window.marky.listRecent().then(setRecent)
    return window.marky.onRecentUpdated(setRecent)
  }, [])

  // Keep "3분 전" honest while the home screen sits open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const duplicated = useMemo(() => {
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const e of recent) {
      if (seen.has(e.name)) dupes.add(e.name)
      seen.add(e.name)
    }
    return dupes
  }, [recent])

  return (
    // Centred by shrinkable spacers rather than `justify-center`: once the
    // recent list outgrows the window the spacers collapse to 0 and the top
    // stays reachable, where centring would push it out of the scroll range.
    <div className="mx-auto flex min-h-full max-w-md flex-col px-8">
      <div className="min-h-12 flex-1 shrink" />

      <div className="flex flex-col items-center text-center">
        <div className="text-zinc-800 dark:text-zinc-100">
          <Mark />
        </div>
        <h1 className="mt-3 text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Marky
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          마크다운 · PDF · HTML 뷰어
        </p>

        <button
          type="button"
          onClick={() => void window.marky.openDialog()}
          className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
        >
          파일 열기
          <kbd className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-xs font-normal">
            {openHint}
          </kbd>
        </button>

        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          창에 끌어다 놓아도 열립니다
        </p>
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <div className="mb-1.5 flex items-baseline justify-between px-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              최근 파일
            </span>
            <button
              type="button"
              onClick={() => void window.marky.clearRecent()}
              className="rounded text-xs text-zinc-400 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-zinc-600 dark:hover:text-zinc-300"
            >
              모두 지우기
            </button>
          </div>
          <ul className="flex flex-col">
            {recent.map((e) => (
              <li key={e.path} className="group relative">
                <button
                  type="button"
                  onClick={() => void window.marky.openRecent(e.path)}
                  title={e.path}
                  className="flex w-full items-baseline gap-2 rounded px-2 py-1.5 pr-8 text-left hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-zinc-800"
                >
                  <span className="w-9 shrink-0 font-mono text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    {kind(e.path)}
                  </span>
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-200">{e.name}</span>
                  {duplicated.has(e.name) && (
                    <span className="shrink-0 truncate text-xs text-zinc-400 dark:text-zinc-600">
                      {folder(e.path)}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-zinc-400 group-hover:opacity-0 dark:text-zinc-600">
                    {relTime(e.openedAt, now)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void window.marky.removeRecent(e.path)}
                  aria-label={`${e.name} 목록에서 제거`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 group-hover:opacity-100 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-12 flex-1 shrink" />
    </div>
  )
}
