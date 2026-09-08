import { Button, Tooltip } from '@heroui/react'

interface Props {
  filePath: string | null
  dark: boolean
  onOpen: () => void
  onToggleTheme: () => void
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

export default function Toolbar({ filePath, dark, onOpen, onToggleTheme }: Props): JSX.Element {
  return (
    <header
      className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* leave room for macOS traffic lights */}
      <div className="w-16 shrink-0 [-webkit-app-region:drag]" />

      <div
        className="flex items-center gap-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Button size="sm" variant="flat" onPress={onOpen}>
          열기
        </Button>
      </div>

      <div className="flex-1 truncate text-center text-sm text-zinc-500 dark:text-zinc-400">
        {filePath ? basename(filePath) : 'Marky'}
      </div>

      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Tooltip content={dark ? '라이트 모드' : '다크 모드'} size="sm">
          <Button isIconOnly size="sm" variant="light" onPress={onToggleTheme} aria-label="테마 전환">
            {dark ? '☀' : '☾'}
          </Button>
        </Tooltip>
      </div>
    </header>
  )
}
