import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep the shell bootable before `.env` is filled in; swap in real values
  // from Supabase Dashboard -> Project Settings -> API.
  console.warn(
    '[vCARD] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Auth + data calls stay offline until you add them to .env',
  )
}

/**
 * Single Supabase client for the whole app.
 * The anon key is public by design; row level security protects the data.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
