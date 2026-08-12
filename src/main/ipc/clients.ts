import { ipcMain } from 'electron'
import { supabase, ensureSignedIn } from '../services/supabaseClient'
import type { Client, ClientInput } from '../../shared/types'

export function registerClientsIpc(): void {
  ipcMain.handle('clients:list', async (): Promise<Client[]> => {
    await ensureSignedIn()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('full_name', { ascending: true })
    if (error) throw error
    return data as Client[]
  })

  ipcMain.handle('clients:create', async (_event, input: ClientInput): Promise<Client> => {
    await ensureSignedIn()
    const { data, error } = await supabase.from('clients').insert(input).select().single()
    if (error) throw error
    return data as Client
  })

  ipcMain.handle(
    'clients:update',
    async (_event, id: string, input: Partial<ClientInput>): Promise<Client> => {
      await ensureSignedIn()
      const { data, error } = await supabase
        .from('clients')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Client
    }
  )

  ipcMain.handle('clients:delete', async (_event, id: string): Promise<void> => {
    await ensureSignedIn()
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) throw error
  })
}
