import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { supabase, ensureSignedIn } from '../services/supabaseClient'
import type { Exercise, ExerciseInput } from '../../shared/types'

const IMAGE_BUCKET = 'exercise-images'

function mimeFromExt(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
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
    const ext = extname(filePath).toLowerCase() || '.jpg'
    const storagePath = `${randomUUID()}${ext}`

    await ensureSignedIn()
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, fileBuffer, { contentType: mimeFromExt(ext), upsert: false })
    if (error) throw error

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath)
    return data.publicUrl
  })
}
