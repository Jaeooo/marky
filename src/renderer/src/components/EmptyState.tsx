import { Button } from '@heroui/react'

export default function EmptyState({ onOpen }: { onOpen: () => void }): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">📄</div>
      <div>
        <p className="text-lg font-medium">마크다운 파일을 여세요</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          창으로 파일을 끌어다 놓거나 아래 버튼을 누르세요
        </p>
      </div>
      <Button color="primary" variant="flat" onPress={onOpen}>
        파일 열기
      </Button>
    </div>
  )
}
