import { useEffect, useRef, useState } from 'react'

interface Props {
  data: Uint8Array
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDocument = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfPage = any

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3]

export default function PdfView({ data }: Props): JSX.Element {
  const [doc, setDoc] = useState<PdfDocument | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [zoomIdx, setZoomIdx] = useState(3) // 1.0
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  // Load the document once per file.
  useEffect(() => {
    let cancelled = false
    setDoc(null)
    setError(null)
    setPageNum(1)

    void (async () => {
      const pdfjs = await import('pdfjs-dist')
      const workerUrl = await import('pdfjs-dist/build/pdf.worker.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default
      try {
        const loaded: PdfDocument = await pdfjs.getDocument({ data: data.slice() }).promise
        if (cancelled) return
        setDoc(loaded)
        setNumPages(loaded.numPages)
      } catch (err) {
        if (!cancelled) setError(String(err))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data])

  const scale = ZOOM_STEPS[zoomIdx]

  // Render the current page whenever the doc, page, or zoom changes.
  useEffect(() => {
    if (!doc) return
    let cancelled = false

    void (async () => {
      const page: PdfPage = await doc.getPage(pageNum)
      if (cancelled) return
      const viewport = page.getViewport({ scale: scale * 1.5 })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${viewport.width / 1.5}px`
      canvas.style.height = `${viewport.height / 1.5}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      renderTaskRef.current?.cancel()
      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      try {
        await task.promise
      } catch {
        /* superseded by a newer render — ignore */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [doc, pageNum, scale])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        PDF를 열 수 없습니다: {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <button
            className="rounded px-1.5 py-0.5 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((n) => Math.max(1, n - 1))}
          >
            ‹
          </button>
          <span className="tabular-nums">
            {pageNum} / {numPages || '–'}
          </span>
          <button
            className="rounded px-1.5 py-0.5 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((n) => Math.min(numPages, n + 1))}
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="rounded px-1.5 py-0.5 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            disabled={zoomIdx <= 0}
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
          >
            −
          </button>
          <span className="w-11 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            className="rounded px-1.5 py-0.5 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
            disabled={zoomIdx >= ZOOM_STEPS.length - 1}
            onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-900">
        <div className="flex min-h-full justify-center py-6">
          <canvas ref={canvasRef} className="h-fit shadow-md" />
        </div>
      </div>
    </div>
  )
}
