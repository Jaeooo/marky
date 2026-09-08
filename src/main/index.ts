import { app, shell, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { watch, type FSWatcher } from 'chokidar'

const MD_EXT = /\.(md|markdown|mdown|mkd|mkdn|mdx|txt)$/i

let mainWindow: BrowserWindow | null = null
let watcher: FSWatcher | null = null
let pendingOpenPath: string | null = null

function watchFile(win: BrowserWindow, filePath: string): void {
  void watcher?.close()
  watcher = watch(filePath, { ignoreInitial: true })
  watcher.on('change', async () => {
    try {
      const content = await readFile(filePath, 'utf-8')
      win.webContents.send('file:changed', { path: filePath, content })
    } catch {
      /* file briefly unavailable during save — ignore */
    }
  })
}

async function loadFile(win: BrowserWindow, filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    win.webContents.send('file:opened', { path: filePath, content })
    watchFile(win, filePath)
    app.addRecentDocument(filePath)
  } catch (err) {
    dialog.showErrorBox('열기 실패', String(err))
  }
}

async function openFileDialog(win: BrowserWindow): Promise<void> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'mdx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (!canceled && filePaths[0]) await loadFile(win, filePaths[0])
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 480,
    minHeight: 360,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (pendingOpenPath && mainWindow) {
      void loadFile(mainWindow, pendingOpenPath)
      pendingOpenPath = null
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// macOS: opened via Finder / "open with"
app.on('open-file', (event, path) => {
  event.preventDefault()
  if (app.isReady() && mainWindow) void loadFile(mainWindow, path)
  else pendingOpenPath = path
})

// Windows / Linux: file passed as launch argument
const argvPath = process.argv.slice(1).find((a) => MD_EXT.test(a))
if (argvPath) pendingOpenPath = argvPath

// single instance — reuse window, load the file the 2nd launch requested
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    const p = argv.slice(1).find((a) => MD_EXT.test(a))
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      if (p) void loadFile(mainWindow, p)
    }
  })
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'system'
  createWindow()

  ipcMain.handle('dialog:openFile', () => mainWindow && openFileDialog(mainWindow))

  ipcMain.handle('file:read', async (_e, p: string) => {
    const content = await readFile(p, 'utf-8')
    if (mainWindow) watchFile(mainWindow, p)
    app.addRecentDocument(p)
    return { path: p, content }
  })

  ipcMain.handle('theme:toggle', () => {
    nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark'
    return nativeTheme.shouldUseDarkColors
  })
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors)

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:updated', nativeTheme.shouldUseDarkColors)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  void watcher?.close()
  if (process.platform !== 'darwin') app.quit()
})
