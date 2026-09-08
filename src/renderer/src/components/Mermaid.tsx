import { useEffect, useId, useState } from 'react'

let mermaidMod: Promise<typeof import('mermaid').default> | null = null
const loadMermaid = (): Promise<typeof import('mermaid').default> =>
  (mermaidMod ??= import('mermaid').then((m) => m.default))

/**
 * Dark palette that echoes the light theme's lavender (indigo nodes, indigo
 * lines) instead of mermaid's grayscale built-in `dark` theme. Note boxes use
 * an amber tint to match the light theme's yellow.
 */
const DARK_THEME_VARS: Record<string, string> = {
  darkMode: 'true',
  background: '#18181b',
  primaryColor: '#312e81',
  primaryBorderColor: '#818cf8',
  primaryTextColor: '#e0e7ff',
  secondaryColor: '#3f3f46',
  tertiaryColor: '#27272a',
  lineColor: '#a5b4fc',
  textColor: '#d4d4d8',
  mainBkg: '#312e81',
  nodeBorder: '#818cf8',
  clusterBkg: '#27272a',
  clusterBorder: '#52525b',
  titleColor: '#e4e4e7',
  edgeLabelBackground: '#27272a',
  noteBkgColor: '#422006',
  noteTextColor: '#fde68a',
  noteBorderColor: '#a16207',
  actorBkg: '#312e81',
  actorBorder: '#818cf8',
  actorTextColor: '#e0e7ff',
  actorLineColor: '#a5b4fc',
  signalColor: '#d4d4d8',
  signalTextColor: '#d4d4d8',
  labelBoxBkgColor: '#312e81',
  labelBoxBorderColor: '#818cf8',
  labelTextColor: '#e0e7ff',
  loopTextColor: '#d4d4d8',
  activationBkgColor: '#3730a3',
  activationBorderColor: '#818cf8',
  sequenceNumberColor: '#18181b'
}

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
          theme: dark ? 'base' : 'default',
          themeVariables: dark ? DARK_THEME_VARS : {}
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
