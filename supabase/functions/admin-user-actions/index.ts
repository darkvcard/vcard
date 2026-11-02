/**
 * admin-user-actions — privileged auth maintenance for the USER_MANAGEMENT tab.
 *
 * POST { action: 'delete' | 'change_password', userId: string, newPassword?: string }
 *
 * The caller's JWT is validated first and the account must hold the `admin`
 * role in `public.user_roles` before anything touches `auth.users`. The service
 * role key never leaves this function; the browser only sends its own JWT.
 *
 * Deploy:  supabase functions deploy admin-user-actions
 * Secrets: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
 *          injected by the platform — no manual `supabase secrets set` needed.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Smallest password this function will push into `auth.users`. */
const MIN_PASSWORD_LENGTH = 8

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type Payload = {
  action?: string
  userId?: string
  newPassword?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return reply({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return reply({ error: 'missing_environment' }, 500)
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return reply({ error: 'missing_authorization' }, 401)
  }

  /* ---------- 1. verify the caller ---------------------------------------- */
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: callerData, error: callerError } = await caller.auth.getUser(token)
  const callerId = callerData?.user?.id
  if (callerError || !callerId) {
    return reply({ error: 'invalid_session', message: callerError?.message }, 401)
  }

  /* ---------- 2. verify the caller is an admin ---------------------------- */
  // Service role client: reads `user_roles` without depending on the caller's
  // RLS grants, and performs the privileged auth writes below.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: roleRows, error: roleError } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)

  if (roleError) {
    return reply({ error: 'role_lookup_failed', message: roleError.message }, 500)
  }

  const isAdmin = (roleRows ?? []).some(
    (row: { role?: string | null }) => String(row.role ?? '').toLowerCase() === 'admin',
  )
  if (!isAdmin) {
    return reply({ error: 'not_authorized' }, 403)
  }

  /* ---------- 3. validate the payload ------------------------------------- */
  let payload: Payload
  try {
    payload = (await req.json()) as Payload
  } catch {
    return reply({ error: 'invalid_json' }, 400)
  }

  const action = String(payload.action ?? '').trim()
  const userId = String(payload.userId ?? '').trim()

  if (action !== 'delete' && action !== 'change_password') {
    return reply({ error: 'unsupported_action' }, 400)
  }
  if (!userId) {
    return reply({ error: 'user_required' }, 400)
  }
  if (action === 'delete' && userId === callerId) {
    return reply({ error: 'self_delete_blocked' }, 400)
  }

  /* ---------- 4. perform the action --------------------------------------- */
  if (action === 'delete') {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) {
      return reply({ error: 'delete_failed', message: error.message }, 400)
    }
    return reply({ ok: true, action, userId })
  }

  const newPassword = String(payload.newPassword ?? '')
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return reply({ error: 'password_too_short', message: `min ${MIN_PASSWORD_LENGTH} characters` }, 400)
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) {
    return reply({ error: 'password_change_failed', message: error.message }, 400)
  }

  return reply({ ok: true, action, userId })
})
