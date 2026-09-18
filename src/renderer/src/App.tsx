import { useCallback, useEffect, useRef, useState } from 'react'
import Toolbar from './components/Toolbar'
import EmptyState from './components/EmptyState'
import MarkdownView from './components/MarkdownView'
import PdfView from './components/PdfView'
import HtmlView from './components/HtmlView'
import Sidebar, { type Heading } from './components/Sidebar'

const SIDEBAR_PREF_KEY = 'marky.sidebarOpen'

interface OpenFile {
  path: string
  content: string
}

interface OpenPdf {
  path: string
  data: Uint8Array
}

interface OpenHtml {
  path: string
  url: string
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

// macOS uses a hidden-inset title bar, so the strip needs to clear the
// traffic lights. Other platforms keep their native title bar above it.
const isMac = navigator.platform.toLowerCase().includes('mac')

export default function App(): JSX.Element {
  const [file, setFile] = useState<OpenFile | null>(null)
  const [pdf, setPdf] = useState<OpenPdf | null>(null)
  const [html, setHtml] = useState<OpenHtml | null>(null)
  const [dark, setDark] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(SIDEBAR_PREF_KEY) !== '0')
  const scrollRef = useRef<HTMLDivElement>(null)

  const applyTheme = useCallback((isDark: boolean) => {
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    void window.marky.getTheme().then(applyTheme)
    return window.marky.onThemeUpdated(applyTheme)
  }, [applyTheme])

  useEffect(() => {
    const offOpened = window.marky.onFileOpened((data) => {
      setFile(data)
      setPdf(null)
      setHtml(null)
      scrollRef.current?.scrollTo({ top: 0 })
    })
    const offChanged = window.marky.onFileChanged((data) => setFile(data))
    const offClosed = window.marky.onFileClosed(() => {
      setFile(null)
      setPdf(null)
      setHtml(null)
      setHeadings([])
    })
    const offPdf = window.marky.onPdfOpened((data) => {
      setPdf(data)
      setFile(null)
      setHtml(null)
      setHeadings([])
    })
    const offHtml = window.marky.onHtmlOpened((data) => {
      setHtml(data)
      setFile(null)
      setPdf(null)
      setHeadings([])
    })
    return () => {
      offOpened()
      offChanged()
      offClosed()
      offPdf()
      offHtml()
    }
  }, [])

  useEffect(() => {
    return window.marky.onSidebarToggle(() => setSidebarOpen((v) => !v))
  }, [])

  const title = pdf
    ? basename(pdf.path)
    : html
      ? basename(html.path)
      : file
        ? basename(file.path)
        : 'Marky'

  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_PREF_KEY, sidebarOpen ? '1' : '0')
  }, [sidebarOpen])

  const toggleTheme = useCallback(() => void window.marky.toggleTheme(), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const handleHeadings = useCallback((h: Heading[]) => setHeadings(h), [])
  const scrollToHeading = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0] as (File & { path?: string }) | undefined
    if (dropped?.path) void window.marky.openPath(dropped.path)
  }, [])

  const showSidebar = sidebarOpen && headings.length > 0

  return (
    <div
      className="flex h-screen bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {showSidebar && (
        <Sidebar headings={headings} onSelect={scrollToHeading} onToggle={toggleSidebar} isMac={isMac} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          title={title}
          dark={dark}
          isMac={isMac}
          onToggleTheme={toggleTheme}
          showSidebarToggle={!showSidebar && headings.length > 0}
          reserveLeftInset={!showSidebar}
          onToggleSidebar={toggleSidebar}
        />

        <div
          ref={scrollRef}
          className={`relative flex-1 ${pdf || html ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          {pdf ? (
            <PdfView data={pdf.data} />
          ) : html ? (
            <HtmlView url={html.url} />
          ) : file ? (
            <MarkdownView source={file.content} onHeadings={handleHeadings} />
          ) : (
            <EmptyState />
          )}

          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-indigo-400 bg-indigo-50/70 text-lg font-medium text-indigo-600 dark:bg-indigo-950/40">
              여기에 파일을 놓으세요
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
