import { contextBridge, ipcRenderer } from 'electron'

export interface FilePayload {
  path: string
  content: string
}

export interface RecentEntry {
  path: string
  name: string
  openedAt: number
}

type Unsubscribe = () => void

const api = {
  readFile: (path: string): Promise<FilePayload> => ipcRenderer.invoke('file:read', path),
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
  onThemeUpdated: (cb: (dark: boolean) => void): Unsubscribe => {
    const listener = (_e: unknown, dark: boolean): void => cb(dark)
    ipcRenderer.on('theme:updated', listener)
    return () => ipcRenderer.removeListener('theme:updated', listener)
  }
}

contextBridge.exposeInMainWorld('marky', api)

export type MarkyApi = typeof api
