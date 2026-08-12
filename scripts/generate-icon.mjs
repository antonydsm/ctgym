import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const source = join(root, 'resources/logo.jpg')
// Recorte cuadrado del emblema (engranaje + "CT"), sin el texto "CT GYM /
// CENTRO DE ENTRENAMIENTO" debajo — ese texto es ilegible en un ícono de
// 16-32px y sobra visualmente en la barra de tareas.
const iconSource = join(root, 'resources/logo-icon-source.png')
const bannerSource = join(root, 'resources/banner.png')

async function main() {
  await mkdir(join(root, 'src/renderer/src/assets'), { recursive: true })

  // Windows .ico (multi-resolution) for the installer/taskbar/window icon
  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const pngBuffers = await Promise.all(
    icoSizes.map((size) => sharp(iconSource).resize(size, size).png().toBuffer())
  )
  const icoBuffer = await pngToIco(pngBuffers)
  await writeFile(join(root, 'resources/icon.ico'), icoBuffer)

  // Single 512px PNG for electron-builder (mac/linux) and as a build resource
  await sharp(iconSource).resize(512, 512).png().toFile(join(root, 'resources/icon.png'))

  // Small PNG for the in-app header logo (fallback/unused once banner is in place)
  await sharp(iconSource)
    .resize(160, 160)
    .png()
    .toFile(join(root, 'src/renderer/src/assets/logo.png'))

  // Banner (horizontal, gear+logo + "CT GYM" wordmark): one optimized copy
  // reused by both the app header and the PDF header, since the source
  // banner.png is a large uncompressed photo-style export (~2.4MB).
  await sharp(bannerSource)
    .resize(700, null)
    .png({ compressionLevel: 9 })
    .toFile(join(root, 'resources/banner-optimized.png'))

  await sharp(bannerSource)
    .resize(700, null)
    .png({ compressionLevel: 9 })
    .toFile(join(root, 'src/renderer/src/assets/banner.png'))

  console.log(
    'Iconos generados: resources/icon.ico, resources/icon.png, resources/banner-optimized.png, src/renderer/src/assets/{logo,banner}.png'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
