import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { fetchUserRole } from '../lib/api'
import { AuthContext } from './auth-context'
import type { AppUser } from './auth-context'

/**
 * Hydrates the app user (id / email / role).
 * The role comes from the `user_roles` table - never from client-side metadata -
 * so admin access is decided by data the operator cannot edit.
 */
async function toAppUser(user: User | null | undefined): Promise<AppUser | null> {
  if (!user) return null
  const role = await fetchUserRole(user.id)
  return { id: user.id, email: user.email ?? null, role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function hydrate(sessionUser: User | null | undefined) {
      try {
        const next = await toAppUser(sessionUser)
        if (alive) setUser(next)
      } catch (error) {
        console.warn('[vCARD] session hydration failed:', error)
        if (alive) setUser(null)
      } finally {
        if (alive) setLoading(false)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => hydrate(data.session?.user))
      .catch(() => {
        if (alive) {
          setUser(null)
          setLoading(false)
        }
      })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Defer the role lookup out of the auth callback: Supabase holds an
        // internal lock while notifying listeners.
        setTimeout(() => {
          void hydrate(session?.user)
        }, 0)
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
