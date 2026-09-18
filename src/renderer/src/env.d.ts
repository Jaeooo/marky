/// <reference types="vite/client" />

import type { MarkyApi } from '../../preload'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare global {
  interface Window {
    marky: MarkyApi
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<Electron.WebviewTag>, Electron.WebviewTag>
    }
  }
}

export {}
