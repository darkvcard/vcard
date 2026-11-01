import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Placeholder values ship in `.env.example`; treat them as "not configured". */
const looksLikePlaceholder = (value?: string) =>
  !value || /your-project-ref|your-public-anon-key|your-anon-key/i.test(value)

/** True once real Supabase credentials are present in the environment. */
export const isSupabaseConfigured =
  !looksLikePlaceholder(supabaseUrl) && !looksLikePlaceholder(supabaseAnonKey)

if (!isSupabaseConfigured) {
  // Keep the shell bootable before `.env` is filled in; swap in real values
  // from Supabase Dashboard -> Project Settings -> API.
  console.warn(
    '[vCARD] Supabase credentials missing or still placeholders. ' +
      'Shop falls back to demo fixtures and auth/data stay offline',
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

