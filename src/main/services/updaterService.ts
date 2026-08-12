import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '../../shared/types'

let status: UpdateStatus = 'idle'
let latestVersion: string | null = null

function emit(event: string, payload?: unknown): void {
  const win = BrowserWindow.getAllWindows()[0]
  win?.webContents.send(event, payload)
}

function setStatus(next: UpdateStatus): void {
  status = next
  emit('updater:status', status)
}

export function getUpdateStatus(): { status: UpdateStatus; version: string | null } {
  return { status, version: latestVersion }
}

export function getAppVersion(): string {
  return app.getVersion()
}

export function initUpdater(): void {
  autoUpdater.autoDownload = false

  autoUpdater.on('checking-for-update', () => setStatus('checking'))

  autoUpdater.on('update-available', (info) => {
    latestVersion = info.version
    setStatus('available')
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-not-available', () => setStatus('not-available'))

  autoUpdater.on('download-progress', (progress) => {
    setStatus('downloading')
    emit('updater:progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', () => setStatus('downloaded'))

  autoUpdater.on('error', (err) => {
    setStatus('error')
    emit('updater:error', String(err))
  })

  // Chequeo al iniciar; no molesta si falla (sin internet, etc.) — el
  // gimnasio sigue usando la app con la versión que ya tiene instalada.
  autoUpdater.checkForUpdates().catch(() => setStatus('error'))
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
