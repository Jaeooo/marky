import { contextBridge, ipcRenderer } from 'electron'

export interface FilePayload {
  path: string
  content: string
}

export interface PdfPayload {
  path: string
  data: Uint8Array
}

export interface HtmlPayload {
  path: string
  url: string
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

  /** Tell main this window's IPC listeners are attached (see renderer:ready). */
  notifyReady: (): Promise<void> => ipcRenderer.invoke('renderer:ready'),

  /** Open the native file picker for this window (same dialog as File → Open). */
  openDialog: (): Promise<void> => ipcRenderer.invoke('dialog:open'),

  listRecent: (): Promise<RecentEntry[]> => ipcRenderer.invoke('recent:list'),
  openRecent: (path: string): Promise<void> => ipcRenderer.invoke('recent:open', path),
  removeRecent: (path: string): Promise<void> => ipcRenderer.invoke('recent:remove', path),
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
  onHtmlOpened: (cb: (data: HtmlPayload) => void): Unsubscribe => {
    const listener = (_e: unknown, data: HtmlPayload): void => cb(data)
    ipcRenderer.on('file:opened-html', listener)
    return () => ipcRenderer.removeListener('file:opened-html', listener)
  },
  onThemeUpdated: (cb: (dark: boolean) => void): Unsubscribe => {
    const listener = (_e: unknown, dark: boolean): void => cb(dark)
    ipcRenderer.on('theme:updated', listener)
    return () => ipcRenderer.removeListener('theme:updated', listener)
  },
  onSidebarToggle: (cb: () => void): Unsubscribe => {
    const listener = (): void => cb()
    ipcRenderer.on('sidebar:toggle', listener)
    return () => ipcRenderer.removeListener('sidebar:toggle', listener)
  }
}

contextBridge.exposeInMainWorld('marky', api)

export type MarkyApi = typeof api
