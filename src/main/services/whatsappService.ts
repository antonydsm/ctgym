import { join } from 'path'
import { appendFileSync } from 'fs'
import { app, BrowserWindow } from 'electron'
import QRCode from 'qrcode'
import puppeteer from 'puppeteer'
import pkg from 'whatsapp-web.js'
import type { WhatsappStatus } from '../../shared/types'

const { Client, LocalAuth, MessageMedia } = pkg
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LoadUtils } = require('whatsapp-web.js/src/util/Injected/Utils')

let client: InstanceType<typeof Client> | null = null
let status: WhatsappStatus = 'idle'
let readyResolved = false

const logPath = join(app.getPath('userData'), 'whatsapp.log')

function log(...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] ${args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ')}\n`
  try {
    appendFileSync(logPath, line)
  } catch {
    // ignore logging failures
  }
}

function emit(event: string, payload?: unknown): void {
  const win = BrowserWindow.getAllWindows()[0]
  win?.webContents.send(event, payload)
}

function setStatus(next: WhatsappStatus): void {
  status = next
  log('status ->', next)
  emit('whatsapp:status', status)
}

export function getWhatsappStatus(): WhatsappStatus {
  return status
}

// Puppeteer descarga su propio Chromium fuera de node_modules (caché del
// usuario), así que no viaja solo dentro del instalador. Se copia esa
// carpeta a resources/chromium (ver scripts/copy-chromium.mjs) y
// electron-builder la empaqueta como cualquier otro recurso suelto
// (excluida del .asar, porque un .exe empaquetado ahí no se puede ejecutar).
function resolveChromiumExecutable(): Promise<string> {
  if (app.isPackaged) {
    return Promise.resolve(join(process.resourcesPath, 'chromium', 'chrome-win64', 'chrome.exe'))
  }
  return puppeteer.executablePath()
}

// whatsapp-web.js emite su propio evento 'ready' desde un callback interno
// que la propia página invoca vía page.exposeFunction(): ese callback llama
// a page.evaluate() para inyectar sus utilidades (window.WWebJS) y recién
// ahí emite 'ready'. En el build empaquetado de esta app ese callback nunca
// llega a completarse — probablemente un deadlock de Puppeteer al llamar
// page.evaluate() desde dentro de la respuesta a una función expuesta, algo
// específico de este entorno. Se verificó exhaustivamente que NO es un
// timeout, ni una excepción, ni el canal de comunicación con la página en
// general (responde con normalidad a page.evaluate() llamado desde afuera,
// incluso con inyecciones grandes). Como respaldo: inyectamos nosotros
// mismos esas utilidades desde un evaluate() externo (que sí funciona) y
// marcamos el estado como listo directamente — sendMessage() opera contra
// la página vía WWebJS, no depende del evento 'ready' en sí.
async function fallbackReadyCheck(): Promise<void> {
  for (let attempt = 0; attempt < 20 && !readyResolved; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (readyResolved || !client?.pupPage) return
    try {
      const hasWWebJS = await client.pupPage.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => typeof (window as any).WWebJS !== 'undefined'
      )
      if (!hasWWebJS) {
        log('fallback ready check: window.WWebJS ausente, inyectando LoadUtils nosotros mismos')
        await client.pupPage.evaluate(LoadUtils)
      }
      if (readyResolved || !client?.pupPage) return
      log('fallback ready check: WWebJS listo, marcando como conectado')
      readyResolved = true
      setStatus('ready')
      return
    } catch (err) {
      log('fallback ready check falló, reintentando', String(err))
    }
  }
  if (!readyResolved) log('fallback ready check: se agotaron los intentos')
}

export async function initWhatsapp(): Promise<void> {
  if (client) return

  setStatus('initializing')
  readyResolved = false

  const executablePath = await resolveChromiumExecutable()
  log('executablePath =', executablePath, 'isPackaged =', app.isPackaged)

  const dataPath = join(app.getPath('userData'), 'wwebjs_auth')

  client = new Client({
    authStrategy: new LocalAuth({ dataPath }),
    puppeteer: {
      headless: true,
      executablePath,
      // Si el proceso anterior se cerró de forma abrupta, Chrome muestra un
      // diálogo nativo de "¿Restaurar páginas?" al reabrir. En headless
      // nadie puede cerrarlo, así que estas banderas lo evitan.
      args: ['--disable-session-crashed-bubble', '--disable-infobars', '--no-first-run']
    }
  })

  client.on('qr', (qr) => {
    log('qr event, length', qr.length)
    setStatus('qr')
    QRCode.toDataURL(qr)
      .then((dataUrl) => emit('whatsapp:qr', dataUrl))
      .catch((err) => log('qrcode toDataURL failed', String(err)))
  })

  client.on('loading_screen', (percent, message) => log('loading_screen', percent, message))
  client.on('auth_failure', (msg) => log('auth_failure', msg))
  client.on('authenticated', () => {
    setStatus('authenticated')
    fallbackReadyCheck()
  })
  client.on('ready', () => {
    readyResolved = true
    setStatus('ready')
  })
  client.on('disconnected', (reason) => {
    log('disconnected', reason)
    // Al desloguearse (p.ej. el usuario desvincula el dispositivo desde el
    // celular), el navegador de Chrome sigue corriendo aunque WhatsApp ya
    // cerró la sesión — si no lo cerramos acá, sigue bloqueando la carpeta
    // de perfil y el próximo intento de vincular falla con "the browser is
    // already running for ...".
    const clientToDestroy = client
    client = null
    setStatus('disconnected')
    clientToDestroy?.destroy().catch((err) => log('destroy() tras disconnect falló', String(err)))
  })

  client.initialize().catch((err) => {
    log('initialize() failed', String(err), err?.stack ?? '')
    setStatus('disconnected')
  })
}

export async function sendRoutinePdf(
  phone: string,
  pdfPath: string,
  caption: string
): Promise<void> {
  if (!client || status !== 'ready') {
    throw new Error('WhatsApp no está vinculado. Andá a Configuración y escaneá el código QR.')
  }
  const media = MessageMedia.fromFilePath(pdfPath)
  await client.sendMessage(`${phone}@c.us`, media, { caption })
}
