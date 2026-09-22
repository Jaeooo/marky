import { app, shell, BrowserWindow, ipcMain, dialog, nativeTheme, Menu, session } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { basename, join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { watch, type FSWatcher } from 'chokidar'
import { check as checkForUpdates, initUpdater } from './updater'

const PDF_EXT = /\.pdf$/i
const HTML_EXT = /\.html?$/i
const OPEN_EXT = /\.(md|markdown|mdown|mkd|mkdn|mdx|txt|pdf|html?)$/i

/** Session partition the sandboxed HTML <webview> renders under. Not
 * "persist:"-prefixed, so it's in-memory only and gone when the app quits —
 * opened HTML files get no cookies/storage that outlive the window. */
const HTML_VIEW_PARTITION = 'html-viewer'

/** One markdown/text file watcher per window, keyed by BrowserWindow id. */
const watchers = new Map<number, FSWatcher>()
/** Windows that currently have any document open (markdown or PDF). */
const openDocs = new Set<number>()
/** Files handed to us (Finder "open with", CLI args) before the app is ready. */
const pendingOpenPaths: string[] = []

// ─── recent files ────────────────────────────────────────────────────────────

export interface RecentEntry {
  path: string
  name: string
  openedAt: number
}

const RECENT_LIMIT = 15
let recentFilePath = ''
let recent: RecentEntry[] = []

function loadRecent(): void {
  recentFilePath = join(app.getPath('userData'), 'recent.json')
  try {
    const parsed: unknown = JSON.parse(readFileSync(recentFilePath, 'utf-8'))
    recent = Array.isArray(parsed) ? (parsed as RecentEntry[]) : []
  } catch {
    recent = []
  }
}

function persistRecent(): void {
  try {
    writeFileSync(recentFilePath, JSON.stringify(recent, null, 2))
  } catch {
    /* best effort */
  }
}

function listRecent(): RecentEntry[] {
  const present = recent.filter((e) => existsSync(e.path))
  if (present.length !== recent.length) {
    recent = present
    persistRecent()
  }
  return recent
}

function addRecent(filePath: string): void {
  recent = [
    { path: filePath, name: basename(filePath), openedAt: Date.now() },
    ...recent.filter((e) => e.path !== filePath)
  ].slice(0, RECENT_LIMIT)
  persistRecent()
  app.addRecentDocument(filePath)
  broadcast('recent:updated', recent)
}

function removeRecent(filePath: string): void {
  recent = recent.filter((e) => e.path !== filePath)
  persistRecent()
  broadcast('recent:updated', recent)
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(channel, payload)
}

function watchFile(win: BrowserWindow, filePath: string): void {
  void watchers.get(win.id)?.close()
  const watcher = watch(filePath, { ignoreInitial: true })
  watcher.on('change', async () => {
    try {
      const content = await readFile(filePath, 'utf-8')
      if (!win.isDestroyed()) win.webContents.send('file:changed', { path: filePath, content })
    } catch {
      /* file briefly unavailable during save — ignore */
    }
  })
  watchers.set(win.id, watcher)
}

// ─── opening files ──────────────────────────────────────────────────────────

/**
 * Windows whose renderer has registered its IPC listeners, and files waiting
 * for that to happen. `webContents.send` drops messages that arrive before
 * the renderer is listening, which is why a cold-start open used to land on
 * the home screen until the file was opened a second time.
 */
const readyWindows = new Set<number>()
const pendingFiles = new Map<number, string>()

/** Open a file in a window now, or as soon as its renderer is listening. */
function openInWindow(win: BrowserWindow, filePath: string): void {
  if (readyWindows.has(win.id)) void loadFile(win, filePath)
  else pendingFiles.set(win.id, filePath)
}

async function loadFile(win: BrowserWindow, filePath: string): Promise<void> {
  try {
    if (PDF_EXT.test(filePath)) {
      void watchers.get(win.id)?.close()
      watchers.delete(win.id)
      const data = await readFile(filePath)
      win.webContents.send('file:opened-pdf', { path: filePath, data })
      openDocs.add(win.id)
      addRecent(filePath)
      return
    }

    if (HTML_EXT.test(filePath)) {
      void watchers.get(win.id)?.close()
      watchers.delete(win.id)
      win.webContents.send('file:opened-html', {
        path: filePath,
        url: pathToFileURL(filePath).href
      })
      openDocs.add(win.id)
      addRecent(filePath)
      return
    }

    const content = await readFile(filePath, 'utf-8')
    win.webContents.send('file:opened', { path: filePath, content })
    watchFile(win, filePath)
    openDocs.add(win.id)
    addRecent(filePath)
  } catch (err) {
    dialog.showErrorBox('열기 실패', String(err))
  }
}

async function openFileDialog(win: BrowserWindow): Promise<void> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (!canceled && filePaths[0]) await loadFile(win, filePaths[0])
}

/**
 * Cmd/Ctrl+W: if the window has a file open, close the document and drop
 * back to the home screen (recent files) — keep the window itself around.
 * Only close the actual OS window once it's already at the home screen.
 */
function closeOrHome(win: BrowserWindow): void {
  if (openDocs.has(win.id)) {
    void watchers.get(win.id)?.close()
    watchers.delete(win.id)
    openDocs.delete(win.id)
    win.webContents.send('file:closed')
  } else {
    win.close()
  }
}

function toggleTheme(): void {
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark'
}

function focusedOrNewWindow(): BrowserWindow {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? createWindow()
}

function createWindow(filePath?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 480,
    minHeight: 360,
    show: false,
    autoHideMenuBar: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  if (filePath) pendingFiles.set(win.id, filePath)

  win.once('ready-to-show', () => win.show())

  win.on('closed', () => {
    void watchers.get(win.id)?.close()
    watchers.delete(win.id)
    openDocs.delete(win.id)
    readyWindows.delete(win.id)
    pendingFiles.delete(win.id)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Lock down the HTML <webview>'s guest regardless of what the renderer
  // requests — the renderer is our own code, but this is the real security
  // boundary against a malicious document opened inside it.
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    if (params.partition !== HTML_VIEW_PARTITION) {
      event.preventDefault()
      return
    }
    webPreferences.javascript = false
    webPreferences.plugins = false
    webPreferences.webSecurity = true
    webPreferences.allowRunningInsecureContent = false
    webPreferences.nodeIntegration = false
    webPreferences.nodeIntegrationInSubFrames = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    delete webPreferences.preload
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/** A window showing the home screen with no document on the way to it. */
function emptyWindow(): BrowserWindow | undefined {
  const isEmpty = (w: BrowserWindow): boolean =>
    !openDocs.has(w.id) && !pendingFiles.has(w.id)
  const focused = BrowserWindow.getFocusedWindow()
  if (focused && isEmpty(focused)) return focused
  // On a cold start nothing is focused yet, so also take the window that
  // whenReady() just created — otherwise it stays behind on the home screen.
  return BrowserWindow.getAllWindows().find(isEmpty)
}

/** Open a file coming from the OS (Finder / CLI) — one window per document. */
function openExternalFile(filePath: string): void {
  const reusable = emptyWindow()
  if (!reusable) {
    createWindow(filePath)
    return
  }
  // The reused window may be minimised or sitting behind another one; the
  // file has to end up somewhere the user can actually see it.
  if (reusable.isMinimized()) reusable.restore()
  reusable.show()
  reusable.focus()
  openInWindow(reusable, filePath)
}

// macOS: opened via Finder / "open with"
app.on('open-file', (event, path) => {
  event.preventDefault()
  if (app.isReady()) openExternalFile(path)
  else pendingOpenPaths.push(path)
})

// Windows / Linux: file passed as launch argument
const argvPath = process.argv.slice(1).find((a) => OPEN_EXT.test(a))
if (argvPath) pendingOpenPaths.push(argvPath)

// single instance — route a 2nd launch's file into this process
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const p = argv.slice(1).find((a) => OPEN_EXT.test(a))
    if (p) {
      openExternalFile(p)
    } else {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    }
  })
}

function buildMenu(): Menu {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              {
                label: '업데이트 확인…',
                click: () => void checkForUpdates(true)
              },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFileDialog(focusedOrNewWindow())
        },
        { type: 'separator' },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const win = BrowserWindow.getFocusedWindow()
            if (win) closeOrHome(win)
          }
        },
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const, label: 'Exit' }])
      ]
    },
    {
      label: 'Edit',
      submenu: [{ role: 'copy' }, { role: 'selectAll' }]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => BrowserWindow.getFocusedWindow()?.webContents.send('sidebar:toggle')
        },
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => toggleTheme()
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' as const }])
      ]
    },
    {
      label: 'Window',
      submenu: isMac
        ? [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
        : [{ role: 'minimize' }, { role: 'close' }]
    },
    ...(isMac
      ? []
      : [
          {
            label: 'Help',
            submenu: [
              {
                label: '업데이트 확인…',
                click: (): void => void checkForUpdates(true)
              }
            ]
          }
        ])
  ]

  return Menu.buildFromTemplate(template)
}

// Guests (opened HTML documents) never get to navigate, pop up windows, or
// reach the network beyond the file they were opened from — JS is already
// off via `will-attach-webview` above, but resource tags (<img>, <link>,
// <iframe>) still fire real requests, so we cut those off at the protocol.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (e) => e.preventDefault())
  contents.on('will-redirect', (e) => e.preventDefault())
})

app.whenReady().then(() => {
  nativeTheme.themeSource = 'system'
  loadRecent()
  Menu.setApplicationMenu(buildMenu())

  initUpdater()

  session.fromPartition(HTML_VIEW_PARTITION).webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !/^(file|data|blob|about):/i.test(details.url) })
  })

  if (pendingOpenPaths.length > 0) {
    pendingOpenPaths.splice(0).forEach((p) => createWindow(p))
  } else {
    createWindow()
  }

  // The renderer calls this once its IPC listeners are attached; anything
  // queued for that window (Finder / CLI launch) goes out now.
  ipcMain.handle('renderer:ready', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    readyWindows.add(win.id)
    const queued = pendingFiles.get(win.id)
    if (queued !== undefined) {
      pendingFiles.delete(win.id)
      void loadFile(win, queued)
    }
  })

  ipcMain.handle('file:open', async (e, p: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) await loadFile(win, p)
  })

  ipcMain.handle('dialog:open', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) await openFileDialog(win)
  })

  ipcMain.handle('recent:list', () => listRecent())
  ipcMain.handle('recent:open', (e, p: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return win ? loadFile(win, p) : undefined
  })
  ipcMain.handle('recent:remove', (_e, p: string) => removeRecent(p))
  ipcMain.handle('recent:clear', () => {
    recent = []
    persistRecent()
    broadcast('recent:updated', recent)
  })

  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)
  ipcMain.handle('theme:toggle', () => {
    toggleTheme()
    return nativeTheme.shouldUseDarkColors
  })

  nativeTheme.on('updated', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('theme:updated', nativeTheme.shouldUseDarkColors)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  for (const w of watchers.values()) void w.close()
  watchers.clear()
  openDocs.clear()
  if (process.platform !== 'darwin') app.quit()
})
