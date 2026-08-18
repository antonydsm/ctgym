import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { registerClientsIpc } from './ipc/clients'
import { registerExercisesIpc } from './ipc/exercises'
import { registerPaymentsIpc } from './ipc/payments'
import { registerRoutinesIpc } from './ipc/routines'
import { registerWhatsappIpc } from './ipc/whatsapp'
import { registerUpdaterIpc } from './ipc/updater'
import { initUpdater } from './services/updaterService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'CT GYM',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.ctgym.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerClientsIpc()
  registerExercisesIpc()
  registerPaymentsIpc()
  registerRoutinesIpc()
  registerWhatsappIpc()
  registerUpdaterIpc()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Solo tiene sentido en el build empaquetado (electron-updater no
  // encuentra app-update.yml en dev) y necesita la ventana ya creada para
  // poder emitir el estado al renderer.
  if (app.isPackaged) {
    initUpdater()
  }
}).catch((error: Error) => {
  dialog.showErrorBox('CT GYM no pudo iniciar', error.stack ?? String(error))
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
