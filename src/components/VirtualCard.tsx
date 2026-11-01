import { Nfc, Wifi } from 'lucide-react'

type VirtualCardProps = {
  holder?: string
  last4?: string
  expiry?: string
  /** Card tier badge, e.g. GHOST / NEON / VOID. */
  tier?: string
  balance?: string
  className?: string
}

/**
 * The signature {vCARD} artifact: a masked virtual debit card.
 * Pure presentational shell - no PAN, no expiry, no CVC are real.
 */
export function VirtualCard({
  holder = 'ANON_OPERATOR',
  last4 = '4021',
  expiry = '09/29',
  tier = 'GHOST',
  balance,
  className = '',
}: VirtualCardProps) {
  return (
    <div
      className={`card-face relative overflow-hidden border border-matrix/25 p-5 ${className}`}
      aria-label={`Virtual ${tier} card ending ${last4}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen" aria-hidden="true">
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-neon/25 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-matrix/20 blur-3xl" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0px,transparent_9px,rgba(0,255,65,0.05)_10px,transparent_11px)]" />
      </div>

      <div className="relative flex items-start justify-between">
        <div>
          <p className="hud text-matrix/60">virtual_debit</p>
          <p className="mt-1 font-mono text-xs font-bold tracking-[0.35em] text-bone/70">
            {'{vCARD}'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-matrix/60">
          <Nfc className="h-4 w-4" aria-hidden="true" />
          <Wifi className="h-4 w-4 rotate-90" aria-hidden="true" />
        </div>
      </div>

      <div className="relative mt-8 flex items-center gap-3">
        {/* chip */}
        <div className="h-7 w-10 rounded-[3px] border border-matrix/30 bg-gradient-to-br from-matrix/40 via-matrix/10 to-transparent">
          <div className="mx-auto mt-1.5 h-4 w-6 border border-matrix/40" />
        </div>
        <span className="chip chip-neon">{tier}</span>
      </div>

      <p className="relative mt-5 font-mono text-lg tracking-[0.18em] text-bone/90 sm:text-xl">
        <span aria-hidden="true">•••• •••• ••••</span>{' '}
        <span className="text-matrix text-glow">{last4}</span>
      </p>

      <div className="relative mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="hud text-[8px] text-matrix/40">card_holder</p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-bone/80">
            {holder}
          </p>
        </div>
        <div>
          <p className="hud text-[8px] text-matrix/40">valid_thru</p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-bone/80">
            {expiry}
          </p>
        </div>
        <div>
          <p className="hud text-[8px] text-matrix/40">balance</p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-matrix">
            {balance ?? '--'}
          </p>
        </div>
      </div>
    </div>
  )
}
