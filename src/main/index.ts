import { app, shell, BrowserWindow, ipcMain, dialog, nativeTheme, Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { basename, join } from 'path'
import { readFile } from 'fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { watch, type FSWatcher } from 'chokidar'

const PDF_EXT = /\.pdf$/i
const OPEN_EXT = /\.(md|markdown|mdown|mkd|mkdn|mdx|txt|pdf)$/i

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
      sandbox: false
    }
  })

  win.once('ready-to-show', () => {
    win.show()
    if (filePath) void loadFile(win, filePath)
  })

  win.on('closed', () => {
    void watchers.get(win.id)?.close()
    watchers.delete(win.id)
    openDocs.delete(win.id)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/** Open a file coming from the OS (Finder / CLI) — one window per document. */
function openExternalFile(filePath: string): void {
  const focused = BrowserWindow.getFocusedWindow()
  const focusedIsEmpty = focused && !openDocs.has(focused.id)
  // reuse a brand-new empty window if that's all we have, else spawn one
  if (focused && focusedIsEmpty) void loadFile(focused, filePath)
  else createWindow(filePath)
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
    }
  ]

  return Menu.buildFromTemplate(template)
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'system'
  loadRecent()
  Menu.setApplicationMenu(buildMenu())

  if (pendingOpenPaths.length > 0) {
    pendingOpenPaths.splice(0).forEach((p) => createWindow(p))
  } else {
    createWindow()
  }

  ipcMain.handle('file:open', async (e, p: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) await loadFile(win, p)
  })

  ipcMain.handle('recent:list', () => listRecent())
  ipcMain.handle('recent:open', (e, p: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return win ? loadFile(win, p) : undefined
  })
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
