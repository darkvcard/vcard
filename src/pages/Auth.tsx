import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton } from '../components/TermButton'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/api'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register'

const handshake = [
  'initialising secure channel…',
  'curve25519 keypair generated',
  'relay: 3 hops · exit 0x7f4a',
  'waiting for operator credentials',
]

const friendly = (raw: string) => {
  const message = raw.toLowerCase()
  if (message.includes('invalid login')) return 'access denied — wrong alias or passphrase'
  if (message.includes('already registered')) return 'alias already on file — switch to login'
  if (message.includes('password')) return raw
  if (message.includes('rate limit')) return 'rate limited — slow down and retry'
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'relay unreachable — supabase endpoint offline'
  }
  return raw
}

export function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { user, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // Already authenticated? Straight to the console.
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [loading, user, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) throw signUpError

        // Email confirmation is disabled on this project. If Supabase still
        // returns a user without a session, try to open one immediately.
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (signInError) throw signInError
        }
        toast.push('identity minted — welcome to the void', 'success')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
        toast.push('access granted', 'success')
      }

      navigate('/dashboard', { replace: true })
    } catch (caught) {
      const message = friendly(errorMessage(caught))
      setError(message)
      toast.push(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  return (
    <div className="animate-rise flex min-h-[68vh] items-center">
      <div className="mx-auto grid w-full max-w-5xl items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        {/* left: handshake log */}
        <div className="order-2 lg:order-1">
          <p className="hud">// identity_gate</p>
          <GlitchText
            as="h1"
            text="ENTER_THE_VOID"
            className="mt-3 font-mono text-3xl font-extrabold tracking-tighter sm:text-4xl"
          />
          <p className="mt-4 max-w-md font-mono text-xs leading-relaxed text-ash/65">
            One alias, one password, zero questions. Your session key never leaves
            this device and nothing is written to a server log.
          </p>

          <Panel label="handshake" className="mt-8">
            <div className="space-y-1.5 p-4 font-mono text-[11px] text-matrix/60">
              {handshake.map((line) => (
                <p key={line}>
                  <span className="text-matrix/35">[::]</span> {line}
                </p>
              ))}
              <p className="text-matrix">
                <span className="animate-blink">▊</span>
              </p>
            </div>
          </Panel>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-neon">
              <Lock className="h-3 w-3" aria-hidden="true" /> zero logs
            </span>
            <span className="chip">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" /> 2fa ready
            </span>
          </div>
        </div>

        {/* right: form */}
        <Panel label="auth_terminal" className="order-1 p-6 sm:p-8 lg:order-2">
          <div className="flex border border-white/10">
            {(['login', 'register'] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => switchMode(item)}
                aria-pressed={mode === item}
                className={`flex-1 cursor-pointer px-4 py-2.5 font-mono text-[10px] tracking-[0.3em] uppercase transition-all ${
                  mode === item
                    ? 'bg-matrix/10 text-matrix shadow-[inset_0_0_20px_-8px_#00ff41]'
                    : 'text-ash/50 hover:text-matrix/70'
                }`}
              >
                {item === 'login' ? '[ LOGIN ]' : '[ REGISTER ]'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate={false}>
            <div>
              <label htmlFor="alias" className="field-label">
                operator_alias
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-matrix/35" aria-hidden="true" />
                <input
                  id="alias"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ghost@protonmail.com"
                  className="field-term pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="passphrase" className="field-label">
                passphrase
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-matrix/35" aria-hidden="true" />
                <input
                  id="passphrase"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="field-term pl-9"
                />
              </div>
              <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
                min 8 chars · never stored in plaintext
              </p>
            </div>

            {mode === 'register' ? (
              <label className="flex cursor-pointer items-start gap-2.5 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-ash/55">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  required
                  className="mt-0.5 h-3 w-3 shrink-0 appearance-none border border-matrix/40 bg-black checked:border-matrix checked:bg-matrix/80"
                />
                <span>
                  I accept that this wallet is unverified and that recovery of lost
                  credentials is impossible.
                </span>
              </label>
            ) : null}

            <TermButton type="submit" prompt=">" fullWidth className="py-3" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  HANDSHAKE…
                </>
              ) : mode === 'login' ? (
                'AUTHENTICATE'
              ) : (
                'MINT_IDENTITY'
              )}
            </TermButton>

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 border border-alert/40 bg-alert/5 px-3 py-2 font-mono text-[10px] tracking-[0.15em] text-[#ff849b] uppercase"
              >
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}
          </form>

          <div className="divider-term my-6" />

          <p className="font-mono text-[9.5px] leading-relaxed tracking-[0.15em] text-ash/35 uppercase">
            anonymous by default · no kyc · no cookies · session persists in
            local storage only
          </p>
        </Panel>
      </div>
    </div>
  )
}
