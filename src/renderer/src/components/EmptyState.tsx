export default function EmptyState(): JSX.Element {
  const openHint = navigator.platform.toLowerCase().includes('mac') ? '⌘O' : 'Ctrl+O'
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-zinc-400 dark:text-zinc-500">
      <div className="text-4xl opacity-60">📄</div>
      <p className="text-sm">
        마크다운 파일을 창에 끌어다 놓거나 <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{openHint}</kbd> 로 여세요
      </p>
    </div>
  )
}
