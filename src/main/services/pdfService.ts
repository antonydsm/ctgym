import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import pdfMake from 'pdfmake'
import { supabase, ensureSignedIn } from './supabaseClient'
import type { Client, ClientPayment, Exercise, RoutineExercise } from '../../shared/types'
import { PLAN_MONTHS } from '../../shared/membership'
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

// paid_at/due_at viajan como 'YYYY-MM-DD' (sin hora). Formatear con `Date` +
// toLocaleDateString corre el riesgo de mostrar un día menos en husos
// horarios negativos (medianoche UTC cae en el día anterior en hora local)
// — armamos el texto directo desde los números, sin pasar por Date.
function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d}/${m}/${y}`
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

// 58mm = 58 * 72 / 25.4 pt, redondeado. Alto fijo generoso (no hay forma de
// pedirle a pdfmake una página "de largo infinito" como una bobina térmica;
// un PDF de una sola página con algo de blanco al final funciona bien tanto
// para imprimir como para enviar).
const RECEIPT_WIDTH = 164
const RECEIPT_HEIGHT = 235

interface PaymentReceiptData extends ClientPayment {
  client: Client
}

export async function exportPaymentReceiptToPdf(paymentId: string): Promise<string> {
  await ensureSignedIn()

  const { data, error } = await supabase
    .from('client_payments')
    .select('*, client:clients(*)')
    .eq('id', paymentId)
    .single()
  if (error) throw error

  const payment = data as unknown as PaymentReceiptData
  const months = PLAN_MONTHS[payment.plan]

  // Función, no un objeto const reusado: si el mismo objeto de contenido
  // aparece dos veces en el documento, pdfmake arrastra la posición
  // calculada la primera vez y corrompe el render de la segunda aparición
  // (aparecían unas barras/rayas grises de más cerca del cupón).
  function dashedLine() {
    return {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: RECEIPT_WIDTH - 24,
          y2: 0,
          lineWidth: 1,
          lineColor: '#999999',
          dash: { length: 2, space: 2 }
        }
      ],
      margin: [0, 6, 0, 6] as [number, number, number, number]
    }
  }

  const docDefinition = {
    pageSize: { width: RECEIPT_WIDTH, height: RECEIPT_HEIGHT },
    pageMargins: [12, 14, 12, 14] as [number, number, number, number],
    content: [
      { text: 'CT GYM', bold: true, fontSize: 13, alignment: 'center' },
      { text: 'RECIBO OFICIAL', fontSize: 8, alignment: 'center', margin: [0, 2, 0, 0] },
      {
        text: formatDateOnly(payment.paid_at),
        fontSize: 8,
        alignment: 'center',
        color: '#666666'
      },
      dashedLine(),
      { text: `ATLETA: ${payment.client.full_name.toUpperCase()}`, fontSize: 8, margin: [0, 2, 0, 4] },
      { text: `CÉDULA: ${payment.client.cedula || '—'}`, fontSize: 8, margin: [0, 0, 0, 4] },
      { text: `PLAN: ${months} MES(ES)`, fontSize: 8, margin: [0, 0, 0, 4] },
      { text: `VENCE: ${formatDateOnly(payment.due_at)}`, fontSize: 8 },
      dashedLine(),
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: 'CUPÓN DE SORTEO', bold: true, fontSize: 8, alignment: 'center' },
                  {
                    text: 'Participás del sorteo mensual por estar al día.',
                    fontSize: 7,
                    alignment: 'center',
                    margin: [0, 4, 0, 0]
                  },
                  { text: '¡Éxitos, Campeón!', fontSize: 7, alignment: 'center', margin: [0, 2, 0, 0] }
                ],
                margin: [4, 6, 4, 6]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#333333',
          vLineColor: () => '#333333'
        }
      },
      {
        text: 'Entrena duro, entrena en CT GYM.',
        fontSize: 7,
        alignment: 'center',
        color: '#888888',
        margin: [0, 10, 0, 0]
      }
    ],
    defaultStyle: { font: 'Roboto', fontSize: 8 }
  }

  const clientSlug = sanitizeFilename(payment.client.full_name) || 'cliente'
  const outputPath = join(app.getPath('temp'), `recibo-${clientSlug}-${payment.paid_at}.pdf`)

  const doc = pdfMake.createPdf(docDefinition)
  await doc.write(outputPath)

  return outputPath
}
