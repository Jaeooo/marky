import { useCallback, useEffect, useRef, useState } from 'react'
import Toolbar from './components/Toolbar'
import EmptyState from './components/EmptyState'
import MarkdownView from './components/MarkdownView'

interface OpenFile {
  path: string
  content: string
}

export default function App(): JSX.Element {
  const [file, setFile] = useState<OpenFile | null>(null)
  const [dark, setDark] = useState(false)
  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const applyTheme = useCallback((isDark: boolean) => {
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  // theme wiring
  useEffect(() => {
    void window.marky.getTheme().then(applyTheme)
    return window.marky.onThemeUpdated(applyTheme)
  }, [applyTheme])

  // file wiring
  useEffect(() => {
    const offOpened = window.marky.onFileOpened((data) => {
      setFile(data)
      scrollRef.current?.scrollTo({ top: 0 })
    })
    const offChanged = window.marky.onFileChanged((data) => setFile(data))
    return () => {
      offOpened()
      offChanged()
    }
  }, [])

  const openDialog = useCallback(() => void window.marky.openFileDialog(), [])
  const toggleTheme = useCallback(() => void window.marky.toggleTheme().then(applyTheme), [applyTheme])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0] as (File & { path?: string }) | undefined
    if (dropped?.path) void window.marky.readFile(dropped.path).then(setFile)
  }, [])

  return (
    <div
      className="flex h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Toolbar
        filePath={file?.path ?? null}
        dark={dark}
        onOpen={openDialog}
        onToggleTheme={toggleTheme}
      />

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        {file ? <MarkdownView source={file.content} /> : <EmptyState onOpen={openDialog} />}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-primary-400 bg-primary-50/70 text-lg font-medium text-primary-600 dark:bg-primary-950/40">
            여기에 마크다운 파일을 놓으세요
          </div>
        )}
      </div>
    </div>
  )
}
