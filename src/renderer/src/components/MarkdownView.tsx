import { useEffect, useMemo, useRef } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import Mermaid from './Mermaid'
import type { Heading } from './Sidebar'

// NOTE: rehype-raw passes author HTML straight through. Fine for local, trusted
// files. If Marky ever opens remote/untrusted content, add rehype-sanitize here.
const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [
  rehypeRaw,
  // KaTeX: render $…$ / $$…$$; show broken math in red instead of throwing
  [rehypeKatex, { errorColor: '#ef4444', strict: false, throwOnError: false }],
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'wrap' }]
] as const

const components: Components = {
  code({ className, children, ...props }) {
    const lang = /language-(\w+)/.exec(className ?? '')?.[1]
    if (lang === 'mermaid') {
      return <Mermaid chart={String(children).trim()} />
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }
}

interface Props {
  source: string
  onHeadings?: (headings: Heading[]) => void
}

export default function MarkdownView({ source, onHeadings }: Props): JSX.Element {
  const articleRef = useRef<HTMLElement>(null)

  const tree = useMemo(
    () => (
      <Markdown
        remarkPlugins={remarkPlugins}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={rehypePlugins as any}
        components={components}
      >
        {source}
      </Markdown>
    ),
    [source]
  )

  // rehype-slug assigns ids to h1–h6 as they render; read them back off the
  // DOM after paint rather than re-deriving slugs ourselves, so the sidebar
  // always links to exactly what's on screen.
  useEffect(() => {
    if (!onHeadings) return
    const article = articleRef.current
    if (!article) return
    const headings: Heading[] = Array.from(
      article.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).map((el) => ({
      id: el.id,
      text: el.textContent ?? '',
      level: Number(el.tagName[1])
    }))
    onHeadings(headings)
  }, [tree, onHeadings])

  return (
    <article
      ref={articleRef}
      className="prose prose-zinc mx-auto max-w-3xl px-8 py-10 dark:prose-invert prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800/60"
    >
      {tree}
    </article>
  )
}
