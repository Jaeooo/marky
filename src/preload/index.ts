import { contextBridge, ipcRenderer } from 'electron'

export interface FilePayload {
  path: string
  content: string
}

export interface PdfPayload {
  path: string
  data: Uint8Array
}

export interface RecentEntry {
  path: string
  name: string
  openedAt: number
}

type Unsubscribe = () => void

const api = {
  /** Ask main to open a path (any supported type) into this window. */
  openPath: (path: string): Promise<void> => ipcRenderer.invoke('file:open', path),
  getTheme: (): Promise<boolean> => ipcRenderer.invoke('theme:get'),
  toggleTheme: (): Promise<boolean> => ipcRenderer.invoke('theme:toggle'),

  listRecent: (): Promise<RecentEntry[]> => ipcRenderer.invoke('recent:list'),
  openRecent: (path: string): Promise<void> => ipcRenderer.invoke('recent:open', path),
  clearRecent: (): Promise<void> => ipcRenderer.invoke('recent:clear'),
  onRecentUpdated: (cb: (entries: RecentEntry[]) => void): Unsubscribe => {
    const listener = (_e: unknown, entries: RecentEntry[]): void => cb(entries)
    ipcRenderer.on('recent:updated', listener)
    return () => ipcRenderer.removeListener('recent:updated', listener)
  },

  onFileOpened: (cb: (data: FilePayload) => void): Unsubscribe => {
    const listener = (_e: unknown, data: FilePayload): void => cb(data)
    ipcRenderer.on('file:opened', listener)
    return () => ipcRenderer.removeListener('file:opened', listener)
  },
  onFileChanged: (cb: (data: FilePayload) => void): Unsubscribe => {
    const listener = (_e: unknown, data: FilePayload): void => cb(data)
    ipcRenderer.on('file:changed', listener)
    return () => ipcRenderer.removeListener('file:changed', listener)
  },
  onFileClosed: (cb: () => void): Unsubscribe => {
    const listener = (): void => cb()
    ipcRenderer.on('file:closed', listener)
    return () => ipcRenderer.removeListener('file:closed', listener)
  },
  onPdfOpened: (cb: (data: PdfPayload) => void): Unsubscribe => {
    const listener = (_e: unknown, data: PdfPayload): void => cb(data)
    ipcRenderer.on('file:opened-pdf', listener)
    return () => ipcRenderer.removeListener('file:opened-pdf', listener)
  },
  onThemeUpdated: (cb: (dark: boolean) => void): Unsubscribe => {
    const listener = (_e: unknown, dark: boolean): void => cb(dark)
    ipcRenderer.on('theme:updated', listener)
    return () => ipcRenderer.removeListener('theme:updated', listener)
  }
}

contextBridge.exposeInMainWorld('marky', api)

export type MarkyApi = typeof api
