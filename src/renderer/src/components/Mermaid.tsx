import { useEffect, useId, useState } from 'react'

let mermaidMod: Promise<typeof import('mermaid').default> | null = null
const loadMermaid = (): Promise<typeof import('mermaid').default> =>
  (mermaidMod ??= import('mermaid').then((m) => m.default))

/** Track the app's dark-mode class so diagrams re-render on theme toggle. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

export default function Mermaid({ chart }: { chart: string }): JSX.Element {
  const dark = useIsDark()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadMermaid()
      .then((mermaid) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'default'
        })
        return mermaid.render(`m-${id}-${dark ? 'd' : 'l'}`, chart)
      })
      .then(({ svg }) => {
        if (cancelled) return
        setSvg(svg)
        setError('')
      })
      .catch((e) => {
        if (cancelled) return
        setSvg('')
        setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [chart, id, dark])

  if (error) {
    return <pre className="text-sm text-red-500">{error}</pre>
  }
  return <div className="my-4 flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
}
