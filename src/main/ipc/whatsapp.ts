import { ipcMain } from 'electron'
import { getWhatsappStatus, initWhatsapp, sendRoutinePdf } from '../services/whatsappService'
import { exportRoutineToPdf } from '../services/pdfService'
import { supabase, ensureSignedIn } from '../services/supabaseClient'
import type { Client } from '../../shared/types'

export function registerWhatsappIpc(): void {
  ipcMain.handle('whatsapp:init', async () => {
    await initWhatsapp()
  })

  ipcMain.handle('whatsapp:get-status', () => getWhatsappStatus())

  ipcMain.handle('routines:send-whatsapp', async (_event, routineId: string): Promise<void> => {
    await ensureSignedIn()

    const { data, error } = await supabase
      .from('routines')
      .select('*, client:clients(*)')
      .eq('id', routineId)
      .single()
    if (error) throw error

    const routine = data as { client_id: string | null; name: string | null; client: Client }
    if (!routine.client) throw new Error('La rutina no tiene un cliente asociado')

    try {
      const pdfPath = await exportRoutineToPdf(routineId)
      const caption = `Rutina${routine.name ? ` - ${routine.name}` : ''} - CT GYM`
      await sendRoutinePdf(routine.client.phone, pdfPath, caption)

      await supabase.from('routine_sends').insert({
        routine_id: routineId,
        client_id: routine.client_id,
        channel: 'whatsapp',
        status: 'sent'
      })
    } catch (sendError) {
      await supabase.from('routine_sends').insert({
        routine_id: routineId,
        client_id: routine.client_id,
        channel: 'whatsapp',
        status: 'failed',
        error_message: (sendError as Error).message
      })
      throw sendError
    }
  })
}
