import { app, dialog } from 'electron'
import electronUpdater, { type UpdateInfo } from 'electron-updater'

const { autoUpdater } = electronUpdater

/**
 * Auto-update against the GitHub release feed configured in
 * electron-builder.yml. The download runs in the background; the new version
 * is swapped in on quit, and the user is asked whether to restart right away.
 *
 * Only works in a packaged, signed build — `npm run dev` skips it entirely.
 */

/** True while a check the user started from the menu is in flight, so the
 *  silent launch check never pops "already up to date" dialogs. */
let userInitiated = false
let checking = false

function versionLine(info: UpdateInfo): string {
  return `${app.name} ${info.version}`
}

async function promptRestart(info: UpdateInfo): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: 'info',
    message: `${versionLine(info)} 설치 준비 완료`,
    detail: '앱을 다시 시작하면 새 버전으로 열립니다.',
    buttons: ['지금 다시 시작', '나중에'],
    defaultId: 0,
    cancelId: 1
  })
  if (response === 0) autoUpdater.quitAndInstall()
}

export function initUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-not-available', (info) => {
    if (!userInitiated) return
    userInitiated = false
    void dialog.showMessageBox({
      type: 'info',
      message: '최신 버전입니다',
      detail: versionLine(info)
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    userInitiated = false
    void promptRestart(info)
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater]', err)
    if (!userInitiated) return
    userInitiated = false
    void dialog.showMessageBox({
      type: 'error',
      message: '업데이트를 확인할 수 없습니다',
      detail: String(err instanceof Error ? err.message : err)
    })
  })

  autoUpdater.on('update-available', (info) => {
    if (!userInitiated) return
    void dialog.showMessageBox({
      type: 'info',
      message: `${versionLine(info)} 내려받는 중`,
      detail: '완료되면 다시 시작할지 물어봅니다.'
    })
  })

  // Quiet check a few seconds after launch, so it never delays the first window.
  setTimeout(() => void check(false), 4000)
}

/** Run a check. `fromMenu` decides whether the result is shown as a dialog. */
export async function check(fromMenu: boolean): Promise<void> {
  if (!app.isPackaged) {
    if (fromMenu) {
      await dialog.showMessageBox({
        type: 'info',
        message: '개발 빌드에서는 업데이트를 확인하지 않습니다',
        detail: '패키징된 앱에서만 동작합니다.'
      })
    }
    return
  }

  if (checking) return
  checking = true
  if (fromMenu) userInitiated = true

  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // The 'error' event above already reported it; this only keeps the
    // promise from rejecting into an unhandled rejection.
  } finally {
    checking = false
  }
}
