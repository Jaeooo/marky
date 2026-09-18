import { useEffect, useRef } from 'react'

interface Props {
  url: string
}

/**
 * Renders a local .html/.htm file. Deliberately not styled/skinned like
 * MarkdownView or PdfView — the opened document IS the content, we're just
 * displaying it safely:
 *
 *  - JavaScript is force-disabled on the guest from the main process
 *    (`will-attach-webview`), regardless of what's set here.
 *  - Network requests are locked to file:/data:/blob:/about: at the session
 *    level, so remote images/fonts/tracking pixels never load.
 *  - Navigation and popups are blocked; the document can't browse away.
 *
 * `partition`/`webpreferences`/`src` are set imperatively (React doesn't
 * know the `<webview>` attributes, and `partition` must land before the
 * guest ever attaches) — see src/main/index.ts (HTML_VIEW_PARTITION) for
 * the enforcement side.
 */
export default function HtmlView({ url }: Props): JSX.Element {
  const ref = useRef<Electron.WebviewTag | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.setAttribute('partition', 'html-viewer')
    el.setAttribute('webpreferences', 'javascript=no,plugins=no,images=yes')
    el.setAttribute('src', url)
  }, [url])

  return <webview key={url} ref={ref} className="h-full w-full bg-white" />
}
