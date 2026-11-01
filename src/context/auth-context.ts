import { createContext } from 'react'

export type AppRole = 'user' | 'admin'

export type AppUser = {
  id: string
  email: string | null
  role: AppRole
}

export type AuthState = {
  /** Signed-in operator, or null when anonymous. */
  user: AppUser | null
  /** Convenience mirror of `user.role`. */
  role: AppRole | null
  isAdmin: boolean
  /** True while the initial Supabase session is being restored. */
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
