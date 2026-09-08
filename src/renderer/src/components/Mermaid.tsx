import { useEffect, useId, useState } from 'react'

let mermaidLoaded: Promise<typeof import('mermaid').default> | null = null

function loadMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidLoaded) {
    mermaidLoaded = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
      return mermaid
    })
  }
  return mermaidLoaded
}

export default function Mermaid({ chart }: { chart: string }): JSX.Element {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    loadMermaid()
      .then((mermaid) => mermaid.render(`m-${id}`, chart))
      .then(({ svg }) => !cancelled && setSvg(svg))
      .catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [chart, id])

  if (error) {
    return <pre className="text-sm text-red-500">{error}</pre>
  }
  return <div className="my-4 flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
}
