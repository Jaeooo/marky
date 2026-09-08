import { useEffect, useState } from 'react'
import type { RecentEntry } from '../../../preload'

const openHint = navigator.platform.toLowerCase().includes('mac') ? '⌘O' : 'Ctrl+O'

function relTime(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

export default function EmptyState(): JSX.Element {
  const [recent, setRecent] = useState<RecentEntry[]>([])

  useEffect(() => {
    void window.marky.listRecent().then(setRecent)
    return window.marky.onRecentUpdated(setRecent)
  }, [])

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-8 py-12">
      <p className="text-sm text-zinc-400 dark:text-zinc-500">
        마크다운 파일을 창에 끌어다 놓거나{' '}
        <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {openHint}
        </kbd>{' '}
        로 여세요
      </p>

      {recent.length > 0 && (
        <div className="mt-8">
          <div className="mb-1.5 flex items-baseline justify-between px-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              최근 파일
            </span>
            <button
              type="button"
              onClick={() => void window.marky.clearRecent()}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300"
            >
              지우기
            </button>
          </div>
          <ul className="flex flex-col">
            {recent.map((e) => (
              <li key={e.path}>
                <button
                  type="button"
                  onClick={() => void window.marky.openRecent(e.path)}
                  title={e.path}
                  className="flex w-full items-baseline justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-200">{e.name}</span>
                  <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
                    {relTime(e.openedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
