import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.MAIN_VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.MAIN_VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan MAIN_VITE_SUPABASE_URL / MAIN_VITE_SUPABASE_ANON_KEY en el archivo .env')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

let signInPromise: Promise<void> | null = null

// La app usa una única cuenta de staff del gimnasio; se loguea una sola vez
// (lazy, en el primer pedido IPC) y reutiliza la sesión para todas las
// operaciones subsiguientes, ya que las políticas RLS exigen "authenticated".
export function ensureSignedIn(): Promise<void> {
  if (!signInPromise) {
    signInPromise = signIn().catch((error) => {
      signInPromise = null
      throw error
    })
  }
  return signInPromise
}

async function signIn(): Promise<void> {
  const email = import.meta.env.MAIN_VITE_STAFF_EMAIL
  const password = import.meta.env.MAIN_VITE_STAFF_PASSWORD

  if (!email || !password) {
    throw new Error('Faltan MAIN_VITE_STAFF_EMAIL / MAIN_VITE_STAFF_PASSWORD en el archivo .env')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}
