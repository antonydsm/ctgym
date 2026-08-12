import puppeteer from 'puppeteer'
import { cp, mkdir, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

async function main() {
  const executablePath = await puppeteer.executablePath()
  const sourceDir = dirname(executablePath)
  const destDir = join(root, 'resources/chromium/chrome-win64')

  await rm(join(root, 'resources/chromium'), { recursive: true, force: true })
  await mkdir(join(root, 'resources/chromium'), { recursive: true })
  await cp(sourceDir, destDir, { recursive: true })

  console.log(`Chromium (whatsapp-web.js) copiado a ${destDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
