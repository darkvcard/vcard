import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'
import type { AppRole, AppUser } from './auth-context'

/**
 * Maps a Supabase user to the slim shape the UI needs.
 * The role is read from the JWT claims (`app_metadata.role`), which can only be
 * written server-side / from the dashboard. Full profile loading lands with the
 * real auth step - for now the shell just needs a truthy role to gate /admin.
 */
function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) return null
  const claim = (user.app_metadata as Record<string, unknown> | undefined)?.role
  const role: AppRole = claim === 'admin' ? 'admin' : 'user'
  return { id: user.id, email: user.email ?? null, role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return
        setUser(toAppUser(data.session?.user))
      })
      .catch(() => {
        // Unreachable / unconfigured Supabase must never break the shell.
        if (alive) setUser(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(toAppUser(session?.user))
        setLoading(false)
      },
    )

    return () => {
      alive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    setUser(null)
    try {
      await supabase.auth.signOut()
    } catch {
      // Offline / unconfigured project: local state is already cleared.
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isAdmin: user?.role === 'admin',
      loading,
      signOut,
    }),
    [user, loading, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
