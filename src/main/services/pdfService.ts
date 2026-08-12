import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import pdfMake from 'pdfmake'
import { supabase, ensureSignedIn } from './supabaseClient'
import type { Client, Exercise, RoutineExercise } from '../../shared/types'
import bannerAsset from '../../../resources/banner-optimized.png?asset'
import xeraLogoAsset from '../../../resources/xera-logo.png?asset'

const pdfMakeRoot = dirname(require.resolve('pdfmake/package.json'))
const robotoDir = join(pdfMakeRoot, 'fonts/Roboto')

pdfMake.addFonts({
  Roboto: {
    normal: join(robotoDir, 'Roboto-Regular.ttf'),
    bold: join(robotoDir, 'Roboto-Medium.ttf'),
    italics: join(robotoDir, 'Roboto-Italic.ttf'),
    bolditalics: join(robotoDir, 'Roboto-MediumItalic.ttf')
  }
})
// No usamos imágenes por URL/ruta dentro del docDefinition (el logo se
// embebe como base64 inline), así que no hace falta permitir acceso externo.
// El único acceso a archivos locales que pdfmake necesita es leer las
// fuentes Roboto que registramos arriba.
pdfMake.setUrlAccessPolicy(() => false)
pdfMake.setLocalAccessPolicy((path) => path.startsWith(robotoDir))

const bannerBase64 = `data:image/png;base64,${readFileSync(bannerAsset).toString('base64')}`
const xeraLogoBase64 = `data:image/png;base64,${readFileSync(xeraLogoAsset).toString('base64')}`

const BANNER_WIDTH = 150
const XERA_LOGO_WIDTH = 70

interface RoutinePdfData {
  id: string
  name: string | null
  notes: string | null
  created_at: string
  client: Client
  routine_exercises: (RoutineExercise & { exercise: Exercise | null })[]
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function exportRoutineToPdf(routineId: string): Promise<string> {
  await ensureSignedIn()

  const { data, error } = await supabase
    .from('routines')
    .select('*, client:clients(*), routine_exercises(*, exercise:exercises(*))')
    .eq('id', routineId)
    .order('order_index', { referencedTable: 'routine_exercises', ascending: true })
    .single()
  if (error) throw error

  const routine = data as unknown as RoutinePdfData

  const exerciseImages = new Map<string, string>()
  await Promise.all(
    routine.routine_exercises.map(async (re) => {
      if (!re.exercise?.id || !re.exercise.image_url) return
      const dataUri = await fetchImageAsDataUri(re.exercise.image_url)
      if (dataUri) exerciseImages.set(re.exercise.id, dataUri)
    })
  )

  const docDefinition = {
    pageMargins: [40, 40, 40, 85] as [number, number, number, number],
    footer: (currentPage: number, pageCount: number) => ({
      stack: [
        { image: xeraLogoBase64, width: XERA_LOGO_WIDTH, alignment: 'center', margin: [0, 12, 0, 4] },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          color: '#888888'
        }
      ]
    }),
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: routine.name?.trim() || 'Rutina de entrenamiento', style: 'routineTitle' },
              { text: `Cliente: ${routine.client.full_name}`, margin: [0, 8, 0, 0] },
              { text: `Fecha: ${formatDate(routine.created_at)}` }
            ]
          },
          { image: bannerBase64, width: BANNER_WIDTH }
        ]
      },
      routine.notes?.trim()
        ? { text: routine.notes, italics: true, color: '#666666', margin: [0, 8, 0, 0] }
        : null,
      {
        margin: [0, 16, 0, 0],
        table: {
          headerRows: 1,
          widths: ['auto', 55, '*', 'auto', 'auto', '*'],
          body: [
            [
              { text: '#', style: 'th' },
              { text: '', style: 'th' },
              { text: 'Ejercicio', style: 'th' },
              { text: 'Series', style: 'th' },
              { text: 'Reps', style: 'th' },
              { text: 'Notas', style: 'th' }
            ],
            ...routine.routine_exercises.map((re, index) => {
              const imageDataUri = re.exercise?.id ? exerciseImages.get(re.exercise.id) : undefined
              return [
                String(index + 1),
                imageDataUri ? { image: imageDataUri, fit: [50, 50] } : '',
                {
                  stack: [
                    { text: re.exercise?.name ?? '(ejercicio eliminado)', bold: true },
                    re.exercise?.muscle_groups.length
                      ? { text: re.exercise.muscle_groups.join(', '), fontSize: 8, color: '#666666' }
                      : null
                  ].filter(Boolean)
                },
                String(re.sets ?? '—'),
                re.reps || '—',
                re.notes || ''
              ]
            })
          ]
        },
        layout: {
          hLineWidth: (i: number) => (i === 1 ? 1 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => '#dddddd',
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      }
    ].filter(Boolean),
    styles: {
      routineTitle: { fontSize: 16, bold: true },
      th: { bold: true, fillColor: '#e51e26', color: '#ffffff' }
    },
    defaultStyle: { font: 'Roboto', fontSize: 10 }
  }

  const clientSlug = sanitizeFilename(routine.client.full_name) || 'cliente'
  const dateSlug = new Date(routine.created_at).toISOString().slice(0, 10)
  const outputPath = join(app.getPath('temp'), `rutina-${clientSlug}-${dateSlug}.pdf`)

  const doc = pdfMake.createPdf(docDefinition)
  await doc.write(outputPath)

  return outputPath
}
