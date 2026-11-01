import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { GlitchText, Panel } from './GlitchText'
import { useAuth } from '../hooks/useAuth'

function BootScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-matrix/70 uppercase">
        <span className="h-8 w-8 animate-spin border border-matrix/30 border-t-matrix" aria-hidden="true" />
        verifying_clearance…
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <Panel accent="alert" label="access_denied" className="w-full max-w-lg p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-[#ff849b]" aria-hidden="true" />
        <GlitchText
          as="h1"
          text="NO_CLEARANCE"
          className="mt-4 block font-mono text-2xl font-extrabold tracking-tighter sm:text-3xl"
        />
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-ash/60">
          This sector requires the <span className="text-[#ff849b]">admin</span> role.
          Your session was logged and ignored.
        </p>
        <Link to="/" className="term-btn mt-6 inline-flex px-6 py-2.5">
          <span className="term-btn__prompt" aria-hidden="true">
            &gt;
          </span>
          RETURN_HOME
        </Link>
      </Panel>
    </div>
  )
}

type ProtectedRouteProps = {
  children: ReactNode
  /** Require `user_roles.role = 'admin'` in addition to a session. */
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <BootScreen />

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && !isAdmin) return <AccessDenied />

  return <>{children}</>
}

export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <BootScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

