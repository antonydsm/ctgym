import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { supabase, ensureSignedIn } from '../services/supabaseClient'
import type { Exercise, ExerciseInput } from '../../shared/types'

const IMAGE_BUCKET = 'exercise-images'

// pdfmake solo puede embeber PNG/JPEG en el PDF de la rutina. No confiamos
// en la extensión del archivo (un usuario puede renombrar un .gif a .png
// para que el selector lo deje elegir) — miramos los primeros bytes reales.
function detectImageFormat(buffer: Buffer): 'png' | 'jpeg' | 'webp' | 'gif' | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'jpeg'
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
    return 'gif'
  }
  return null
}

function extAndMimeForFormat(format: 'png' | 'jpeg' | 'webp'): { ext: string; mime: string } {
  switch (format) {
    case 'png':
      return { ext: '.png', mime: 'image/png' }
    case 'webp':
      return { ext: '.webp', mime: 'image/webp' }
    case 'jpeg':
      return { ext: '.jpg', mime: 'image/jpeg' }
  }
}

export function registerExercisesIpc(): void {
  ipcMain.handle('exercises:list', async (): Promise<Exercise[]> => {
    await ensureSignedIn()
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return data as Exercise[]
  })

  ipcMain.handle('exercises:create', async (_event, input: ExerciseInput): Promise<Exercise> => {
    await ensureSignedIn()
    const { data, error } = await supabase.from('exercises').insert(input).select().single()
    if (error) throw error
    return data as Exercise
  })

  ipcMain.handle(
    'exercises:update',
    async (_event, id: string, input: Partial<ExerciseInput>): Promise<Exercise> => {
      await ensureSignedIn()
      const { data, error } = await supabase
        .from('exercises')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Exercise
    }
  )

  ipcMain.handle('exercises:delete', async (_event, id: string): Promise<void> => {
    await ensureSignedIn()
    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (error) throw error
  })

  ipcMain.handle('exercises:upload-image', async (): Promise<string | null> => {
    const win = BrowserWindow.getFocusedWindow()
    const dialogOptions = {
      title: 'Elegir imagen del ejercicio',
      properties: ['openFile' as const],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const fileBuffer = await readFile(filePath)
    const format = detectImageFormat(fileBuffer)
    if (format === 'gif') {
      throw new Error(
        'Los GIF no se pueden usar como foto del ejercicio (no se pueden incluir en el PDF de la rutina). Convertí la imagen a PNG o JPG y volvé a intentar.'
      )
    }
    if (format === null) {
      throw new Error(
        'El archivo elegido no es una imagen PNG, JPG o WEBP válida (puede tener la extensión cambiada). Elegí otra imagen.'
      )
    }
    const { ext, mime } = extAndMimeForFormat(format)
    const storagePath = `${randomUUID()}${ext}`

    await ensureSignedIn()
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, fileBuffer, { contentType: mime, upsert: false })
    if (error) throw error

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath)
    return data.publicUrl
  })
}
