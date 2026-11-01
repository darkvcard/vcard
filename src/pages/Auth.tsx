import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, Lock, Mail, ShieldAlert } from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton } from '../components/TermButton'

type Mode = 'login' | 'register'

const handshake = [
  'initialising secure channel…',
  'curve25519 keypair generated',
  'relay: 3 hops · exit 0x7f4a',
  'waiting for operator credentials',
]

export function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Auth wiring lands in the next step (supabase.auth.signInWithPassword /
    // signUp). For the shell we only echo the gate state.
    setNotice(
      `${mode.toUpperCase()} :: ${email || 'anonymous'} — auth_module_pending`,
    )
  }

  function switchMode(next: Mode) {
    setMode(next)
    setNotice(null)
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

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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

            <label className="flex cursor-pointer items-start gap-2.5 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-ash/55">
              <input
                type="checkbox"
                required
                className="mt-0.5 h-3 w-3 shrink-0 appearance-none border border-matrix/40 bg-black checked:border-matrix checked:bg-matrix/80"
              />
              <span>
                I accept that this wallet is unverified and that recovery of lost
                credentials is impossible.
              </span>
            </label>

            <TermButton type="submit" prompt=">" fullWidth className="py-3">
              {mode === 'login' ? 'AUTHENTICATE' : 'MINT_IDENTITY'}
            </TermButton>

            {notice ? (
              <p
                role="status"
                className="border border-matrix/25 bg-matrix/5 px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-matrix/80 uppercase"
              >
                {notice}
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
