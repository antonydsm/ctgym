import { ipcMain, shell } from 'electron'
import { supabase, ensureSignedIn } from '../services/supabaseClient'
import { exportPaymentReceiptToPdf } from '../services/pdfService'
import { addMonths, PLAN_MONTHS } from '../../shared/membership'
import type { ClientPayment, ClientPaymentInput } from '../../shared/types'

export function registerPaymentsIpc(): void {
  ipcMain.handle(
    'payments:listByClient',
    async (_event, clientId: string): Promise<ClientPayment[]> => {
      await ensureSignedIn()
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data as ClientPayment[]
    }
  )

  // Último pago de cada cliente (para mostrar plan/vencimiento/estado en la
  // lista de clientes sin pedir el historial completo de cada uno).
  ipcMain.handle('payments:listLatest', async (): Promise<ClientPayment[]> => {
    await ensureSignedIn()
    const { data, error } = await supabase
      .from('client_payments')
      .select('*')
      .order('paid_at', { ascending: false })
    if (error) throw error

    const latestByClient = new Map<string, ClientPayment>()
    for (const payment of data as ClientPayment[]) {
      if (!latestByClient.has(payment.client_id)) {
        latestByClient.set(payment.client_id, payment)
      }
    }
    return [...latestByClient.values()]
  })

  ipcMain.handle(
    'payments:create',
    async (_event, input: ClientPaymentInput): Promise<ClientPayment> => {
      await ensureSignedIn()
      const dueAt = addMonths(input.paid_at, PLAN_MONTHS[input.plan])
      const { data, error } = await supabase
        .from('client_payments')
        .insert({ ...input, due_at: dueAt })
        .select()
        .single()
      if (error) throw error
      return data as ClientPayment
    }
  )

  ipcMain.handle('payments:export-receipt', async (_event, paymentId: string): Promise<string> => {
    const path = await exportPaymentReceiptToPdf(paymentId)
    await shell.openPath(path)
    return path
  })
}
