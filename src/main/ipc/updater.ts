import { ipcMain } from 'electron'
import { getAppVersion, getUpdateStatus, quitAndInstall } from '../services/updaterService'

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:get-status', () => getUpdateStatus())
  ipcMain.handle('updater:get-app-version', () => getAppVersion())
  ipcMain.handle('updater:quit-and-install', () => quitAndInstall())
}
