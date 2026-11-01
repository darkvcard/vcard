import { useMemo, useState } from 'react'
import { Check, Filter, Lock, Search, ShieldCheck, Zap } from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton } from '../components/TermButton'

type Tier = {
  id: string
  name: string
  brand: 'VISA' | 'MASTERCARD'
  tagline: string
  price: string
  load: string
  limit: string
  perks: string[]
  stock: number
  accent: 'matrix' | 'neon' | 'alert'
  badge?: string
}

const tiers: Tier[] = [
  {
    id: 'ghost-01',
    name: 'GHOST_01',
    brand: 'VISA',
    tagline: 'single-use burner',
    price: '9.00',
    load: 'up to 250 USDT',
    limit: '2,500 / mo',
    perks: ['instant mint', '1 pan', 'burn on demand'],
    stock: 412,
    accent: 'matrix',
  },
  {
    id: 'ghost-05',
    name: 'GHOST_05',
    brand: 'VISA',
    tagline: 'five card bundle',
    price: '34.00',
    load: 'up to 1,200 USDT',
    limit: '9,000 / mo',
    perks: ['5 pans', 'rotate anytime', 'shared balance'],
    stock: 188,
    accent: 'matrix',
    badge: 'popular',
  },
  {
    id: 'neon-10',
    name: 'NEON_10',
    brand: 'MASTERCARD',
    tagline: 'reloadable identity shield',
    price: '59.00',
    load: 'up to 5,000 USDT',
    limit: '25,000 / mo',
    perks: ['reloadable', '3-d secure', 'subscriptions ok'],
    stock: 96,
    accent: 'neon',
  },
  {
    id: 'void-25',
    name: 'VOID_25',
    brand: 'VISA',
    tagline: 'multi-merchant stack',
    price: '129.00',
    load: 'up to 12,000 USDT',
    limit: '60,000 / mo',
    perks: ['25 pans', 'per-card limits', 'csv export'],
    stock: 41,
    accent: 'neon',
    badge: 'restricted',
  },
  {
    id: 'cipher-x',
    name: 'CIPHER_X',
    brand: 'MASTERCARD',
    tagline: 'corporate ops card',
    price: '249.00',
    load: 'up to 40,000 USDT',
    limit: 'unlimited',
    perks: ['team access', 'api minting', 'priority issuer'],
    stock: 12,
    accent: 'alert',
    badge: 'invite only',
  },
  {
    id: 'ash-00',
    name: 'ASH_00',
    brand: 'VISA',
    tagline: 'trial card, zero cost',
    price: '0.00',
    load: 'up to 25 USDT',
    limit: '100 / mo',
    perks: ['1 pan', 'sandbox rails', 'no reload'],
    stock: 999,
    accent: 'matrix',
    badge: 'free',
  },
]

const filters = ['all', 'burner', 'reloadable', 'elite'] as const

const accentStyles = {
  matrix: {
    panel: 'matrix' as const,
    text: 'text-matrix',
    border: 'border-matrix/30',
    glow: 'hover:shadow-[0_0_50px_-20px_rgba(0,255,65,0.6)]',
  },
  neon: {
    panel: 'neon' as const,
    text: 'text-[#d9aaff]',
    border: 'border-neon/40',
    glow: 'hover:shadow-[0_0_50px_-20px_rgba(157,0,255,0.7)]',
  },
  alert: {
    panel: 'alert' as const,
    text: 'text-[#ff849b]',
    border: 'border-alert/40',
    glow: 'hover:shadow-[0_0_50px_-20px_rgba(255,0,60,0.7)]',
  },
}

export function Shop() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof filters)[number]>('all')
  const [queued, setQueued] = useState<string[]>([])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tiers.filter((tier) => {
      const matchesQuery =
        !needle ||
        tier.name.toLowerCase().includes(needle) ||
        tier.tagline.toLowerCase().includes(needle) ||
        tier.brand.toLowerCase().includes(needle)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'burner' && tier.id.startsWith('ghost')) ||
        (filter === 'reloadable' && tier.id.startsWith('neon')) ||
        (filter === 'elite' && ['void-25', 'cipher-x'].includes(tier.id))
      return matchesQuery && matchesFilter
    })
  }, [query, filter])

  function queue(id: string) {
    setQueued((current) => (current.includes(id) ? current : [...current, id]))
  }

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-6 border-b border-matrix/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="hud">// inventory :: restocked 14m ago</p>
          <GlitchText as="h1" text="CARD_VAULT" className="mt-3 font-mono text-4xl font-extrabold tracking-tighter sm:text-5xl" />
          <p className="mt-3 max-w-lg font-mono text-xs leading-relaxed text-ash/65">
            Every listing is a live issuer slot. Mint, fund, and burn from the
            dashboard. Prices settle in USDT at the current rate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">
            <Zap className="h-3 w-3" aria-hidden="true" /> mint &lt; 60s
          </span>
          <span className="chip">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" /> escrow release
          </span>
          <span className="chip chip-neon">
            <Lock className="h-3 w-3" aria-hidden="true" /> no kyc
          </span>
        </div>
      </header>

      {/* filter bar */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="hud mr-1 flex items-center gap-2">
            <Filter className="h-3 w-3" aria-hidden="true" />
            filter
          </span>
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`cursor-pointer border px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase transition-all ${
                filter === item
                  ? 'border-matrix/70 bg-matrix/10 text-matrix shadow-[0_0_16px_-6px_#00ff41]'
                  : 'border-white/10 text-ash/60 hover:border-matrix/40 hover:text-matrix/80'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-matrix/40" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="grep // tier_name"
            aria-label="Search card tiers"
            className="field-term pl-9 text-[11px] tracking-[0.15em]"
          />
        </div>
      </div>

      {/* grid */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((tier) => {
          const style = accentStyles[tier.accent]
          const isQueued = queued.includes(tier.id)
          return (
            <Panel
              key={tier.id}
              accent={style.panel}
              className={`flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 ${style.glow}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`font-mono text-base font-bold tracking-[0.2em] ${style.text}`}>
                    {tier.name}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.22em] text-ash/50 uppercase">
                    {tier.tagline}
                  </p>
                </div>
                {tier.badge ? (
                  <span
                    className={`chip ${
                      tier.accent === 'alert' ? 'chip-alert' : tier.accent === 'neon' ? 'chip-neon' : ''
                    }`}
                  >
                    {tier.badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex items-end justify-between border-y border-white/5 py-4">
                <div>
                  <p className="hud text-[8px]">mint_fee</p>
                  <p className={`mt-1 font-mono text-2xl font-bold tracking-tight ${style.text}`}>
                    {tier.price}
                    <span className="ml-1 text-[10px] tracking-[0.2em] text-ash/50">USDT</span>
                  </p>
                </div>
                <span className={`border px-2 py-1 font-mono text-[9px] tracking-[0.25em] ${style.border} ${style.text}`}>
                  {tier.brand}
                </span>
              </div>

              <dl className="mt-4 space-y-2 font-mono text-[10.5px] tracking-[0.12em]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ash/45 uppercase">load_limit</dt>
                  <dd className="text-bone/75">{tier.load}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ash/45 uppercase">monthly</dt>
                  <dd className="text-bone/75">{tier.limit}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ash/45 uppercase">stock</dt>
                  <dd className={tier.stock < 50 ? 'text-alert' : 'text-bone/75'}>{tier.stock} slots</dd>
                </div>
              </dl>

              <ul className="mt-4 flex flex-wrap gap-1.5">
                {tier.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-center gap-1 border border-white/8 px-2 py-1 font-mono text-[9.5px] tracking-[0.15em] text-ash/60 uppercase"
                  >
                    <Check className="h-2.5 w-2.5 text-matrix/70" aria-hidden="true" />
                    {perk}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <TermButton
                  className="w-full"
                  prompt="&gt;"
                  variant={isQueued ? 'ghost' : 'matrix'}
                  onClick={() => queue(tier.id)}
                >
                  {isQueued ? 'QUEUED' : 'BUY_NOW'}
                </TermButton>
              </div>
            </Panel>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Panel accent="alert" label="no_match" className="mt-8 p-8 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-alert/80 uppercase">
            0 results for “{query}” — try widening the grep
          </p>
        </Panel>
      ) : null}

      {/* queued stub */}
      {queued.length > 0 ? (
        <div className="mt-8 flex flex-col gap-3 border border-matrix/25 bg-matrix/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] tracking-[0.18em] text-matrix/80 uppercase">
            cart :: {queued.join(' · ')}
          </p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-ash/50 uppercase">
            checkout_module_pending · next build
          </p>
        </div>
      ) : null}

      <Panel label="payment_rails" className="mt-10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono text-sm font-bold tracking-[0.2em]">ACCEPTED_TOKENS</h2>
            <p className="mt-2 max-w-md font-mono text-[11px] leading-relaxed text-ash/60">
              Deposits confirm after one network block. Balances convert at the
              live rate and are loaded onto the card instantly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['btc', 'eth', 'usdt', 'xmr', 'ltc'].map((token) => (
              <span key={token} className="chip">
                {token}
              </span>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}
