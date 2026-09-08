/// <reference types="vite/client" />

import type { MarkyApi } from '../../preload'

declare global {
  interface Window {
    marky: MarkyApi
  }
}

export {}
