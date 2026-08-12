import { ipcMain, shell } from 'electron'
import { supabase, ensureSignedIn } from '../services/supabaseClient'
import { exportRoutineToPdf } from '../services/pdfService'
import type { Routine, RoutineSaveInput, RoutineWithExercises } from '../../shared/types'

export function registerRoutinesIpc(): void {
  ipcMain.handle('routines:listByClient', async (_event, clientId: string): Promise<Routine[]> => {
    await ensureSignedIn()
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Routine[]
  })

  ipcMain.handle('routines:get', async (_event, id: string): Promise<RoutineWithExercises> => {
    await ensureSignedIn()
    const { data, error } = await supabase
      .from('routines')
      .select('*, routine_exercises(*, exercise:exercises(*))')
      .eq('id', id)
      .order('order_index', { referencedTable: 'routine_exercises', ascending: true })
      .single()
    if (error) throw error
    return data as unknown as RoutineWithExercises
  })

  ipcMain.handle('routines:save', async (_event, input: RoutineSaveInput): Promise<string> => {
    await ensureSignedIn()

    let routineId = input.id

    if (routineId) {
      const { error } = await supabase
        .from('routines')
        .update({ client_id: input.client_id, name: input.name, notes: input.notes })
        .eq('id', routineId)
      if (error) throw error

      const { error: deleteError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routineId)
      if (deleteError) throw deleteError
    } else {
      const { data, error } = await supabase
        .from('routines')
        .insert({ client_id: input.client_id, name: input.name, notes: input.notes })
        .select()
        .single()
      if (error) throw error
      routineId = (data as Routine).id
    }

    if (input.exercises.length > 0) {
      const rows = input.exercises.map((ex, index) => ({
        routine_id: routineId,
        exercise_id: ex.exercise_id,
        order_index: index,
        sets: ex.sets,
        reps: ex.reps,
        notes: ex.notes
      }))
      const { error } = await supabase.from('routine_exercises').insert(rows)
      if (error) throw error
    }

    return routineId as string
  })

  ipcMain.handle('routines:delete', async (_event, id: string): Promise<void> => {
    await ensureSignedIn()
    const { error } = await supabase.from('routines').delete().eq('id', id)
    if (error) throw error
  })

  ipcMain.handle('routines:export-pdf', async (_event, id: string): Promise<string> => {
    const path = await exportRoutineToPdf(id)
    await shell.openPath(path)
    return path
  })
}
