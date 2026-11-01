import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, ShieldAlert, UserRound, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const publicLinks = [
  { to: '/', label: 'HOME' },
  { to: '/shop', label: 'SHOP' },
  { to: '/dashboard', label: 'DASHBOARD' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return `nav-link ${isActive ? 'text-matrix' : ''}`
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, isAdmin, loading, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/auth')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-matrix/15 bg-void/85 backdrop-blur-md">
      {/* thin status rail */}
      <div className="hidden items-center justify-between border-b border-white/5 bg-black/60 px-4 py-1 sm:px-6 lg:flex lg:px-8">
        <div className="flex items-center gap-4 font-mono text-[9px] tracking-[0.3em] text-matrix/40 uppercase">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-matrix" />
            node_online
          </span>
          <span className="text-white/10">|</span>
          <span>tor_exit: 0x7f4a</span>
          <span className="text-white/10">|</span>
          <span>aes-256-gcm</span>
        </div>
        <div className="font-mono text-[9px] tracking-[0.3em] text-neon/50 uppercase">
          {user ? `operator: ${user.email ?? 'unknown'}` : 'auth: anonymous'}
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* logo */}
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="group flex items-baseline gap-0.5 font-mono text-xl font-extrabold tracking-tighter"
          aria-label="vCARD home"
        >
          <span className="text-neon/80 text-glow-neon transition-colors group-hover:text-neon">
            {'{'}
          </span>
          <span className="text-matrix text-glow">vCARD</span>
          <span className="text-neon/80 text-glow-neon transition-colors group-hover:text-neon">
            {'}'}
          </span>
          <span className="ml-2 hidden font-mono text-[9px] font-normal tracking-[0.28em] text-matrix/35 sm:inline">
            //v2.0
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {publicLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink to="/admin" className={linkClass}>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                ADMIN
              </span>
            </NavLink>
          ) : null}
        </nav>

        {/* desktop actions */}
        <div className="hidden items-center gap-4 md:flex">
          {loading ? (
            <span className="hud animate-pulse text-matrix/40">syncing…</span>
          ) : user ? (
            <span className="flex items-center gap-2 border border-matrix/20 bg-matrix/5 px-2.5 py-1 font-mono text-[9px] tracking-[0.25em] text-matrix/70 uppercase">
              <UserRound className="h-3 w-3" aria-hidden="true" />
              {user.role}
            </span>
          ) : null}
          {user ? (
            <button type="button" onClick={handleSignOut} className="term-btn term-btn--alert px-4 py-2">
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              SIGN OUT
            </button>
          ) : (
            <Link to="/auth" className="term-btn px-4 py-2">
              <span className="term-btn__prompt" aria-hidden="true">
                &gt;
              </span>
              SIGN_IN
            </Link>
          )}
        </div>

        {/* mobile trigger */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="term-btn px-3 py-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* mobile nav */}
      {open ? (
        <div id="mobile-nav" className="border-t border-matrix/10 bg-void/95 px-4 pt-4 pb-6 md:hidden">
          <nav className="flex flex-col gap-4">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                <span className="term-btn__prompt mr-2" aria-hidden="true">
                  &gt;
                </span>
                {link.label}
              </NavLink>
            ))}
            {isAdmin ? (
              <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                <ShieldAlert className="mr-2 h-3 w-3" aria-hidden="true" />
                ADMIN
              </NavLink>
            ) : null}
            <div className="divider-term my-1" />
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="term-btn term-btn--alert w-full"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                SIGN OUT
              </button>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="term-btn w-full">
                <span className="term-btn__prompt" aria-hidden="true">
                  &gt;
                </span>
                SIGN_IN
              </Link>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
