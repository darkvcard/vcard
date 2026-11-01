import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Filter,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { CheckoutDialog } from '../components/CheckoutDialog'
import { TermButton } from '../components/TermButton'
import { errorMessage, fetchCards } from '../lib/api'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Card } from '../types/db'

const filters = ['all', 'in_stock', 'out_of_stock'] as const
type Filter = (typeof filters)[number]

/** Offline fixtures so the themed UI stays reviewable before env vars exist. */
const DEMO_CARDS: Card[] = [
  {
    id: 'demo-ghost-01',
    name: 'GHOST_01',
    tagline: 'single-use burner',
    brand: 'VISA',
    priceUsd: 9,
    stockStatus: 'in_stock',
    loadLimit: 'up to 250 USDT',
    monthlyLimit: '2,500 / mo',
    perks: ['instant mint', '1 pan', 'burn on demand'],
    raw: {},
  },
  {
    id: 'demo-ghost-05',
    name: 'GHOST_05',
    tagline: 'five card bundle',
    brand: 'VISA',
    priceUsd: 34,
    stockStatus: 'in_stock',
    loadLimit: 'up to 1,200 USDT',
    monthlyLimit: '9,000 / mo',
    perks: ['5 pans', 'rotate anytime', 'shared balance'],
    raw: {},
  },
  {
    id: 'demo-neon-10',
    name: 'NEON_10',
    tagline: 'reloadable identity shield',
    brand: 'MASTERCARD',
    priceUsd: 59,
    stockStatus: 'out_of_stock',
    loadLimit: 'up to 5,000 USDT',
    monthlyLimit: '25,000 / mo',
    perks: ['reloadable', '3-d secure', 'subscriptions ok'],
    raw: {},
  },
  {
    id: 'demo-void-25',
    name: 'VOID_25',
    tagline: 'multi-merchant stack',
    brand: 'VISA',
    priceUsd: 129,
    stockStatus: 'in_stock',
    loadLimit: 'up to 12,000 USDT',
    monthlyLimit: '60,000 / mo',
    perks: ['25 pans', 'per-card limits', 'csv export'],
    raw: {},
  },
]

const accents = [
  { panel: 'matrix' as const, text: 'text-matrix', border: 'border-matrix/30' },
  { panel: 'neon' as const, text: 'text-[#d9aaff]', border: 'border-neon/40' },
  { panel: 'alert' as const, text: 'text-[#ff849b]', border: 'border-alert/40' },
]

function accentFor(card: Card) {
  if (card.stockStatus === 'out_of_stock') return accents[2]
  if (card.priceUsd >= 100) return accents[1]
  return accents[0]
}

const usd = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function Shop() {
  const demo = !isSupabaseConfigured
  const [cards, setCards] = useState<Card[] | null>(demo ? DEMO_CARDS : null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Card | null>(null)

  const loading = !demo && cards === null && !error

  useEffect(() => {
    if (demo) return
    let cancelled = false
    fetchCards()
      .then((rows) => {
        if (cancelled) return
        setCards(rows)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false)
      })
    return () => {
      cancelled = true
    }
  }, [demo, nonce])

  const refresh = useCallback(() => {
    setRefreshing(true)
    setNonce((value) => value + 1)
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (cards ?? []).filter((card) => {
      const matchesQuery =
        !needle ||
        card.name.toLowerCase().includes(needle) ||
        card.tagline.toLowerCase().includes(needle) ||
        card.brand.toLowerCase().includes(needle)
      const matchesFilter =
        filter === 'all' || card.stockStatus === filter
      return matchesQuery && matchesFilter
    })
  }, [cards, query, filter])

  const soldOutCount = (cards ?? []).filter((card) => card.stockStatus === 'out_of_stock').length

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-6 border-b border-matrix/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="hud">// inventory :: live from supabase.cards</p>
          <GlitchText as="h1" text="CARD_VAULT" className="mt-3 font-mono text-4xl font-extrabold tracking-tighter sm:text-5xl" />
          <p className="mt-3 max-w-lg font-mono text-xs leading-relaxed text-ash/65">
            Every listing is a live issuer slot. Mint, fund, and burn from the
            dashboard. Prices settle in USDT at the current rate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <Zap className="h-3 w-3" aria-hidden="true" /> mint &lt; 60s
          </span>
          <span className="chip">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" /> escrow release
          </span>
          <span className="chip chip-neon">
            <Lock className="h-3 w-3" aria-hidden="true" /> no kyc
          </span>
          <TermButton variant="ghost" className="px-3 py-1.5 text-[9px]" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            SYNC
          </TermButton>
        </div>
      </header>

      {demo ? (
        <p className="mt-6 border border-neon/30 bg-neon/5 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-[#d9aaff] uppercase">
          demo_data · set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to load the live vault
        </p>
      ) : null}

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
              {item.replace('_', ' ')}
            </button>
          ))}
          {soldOutCount > 0 ? (
            <span className="chip chip-alert">{soldOutCount} sold out</span>
          ) : null}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-matrix/40" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="grep // card_name"
            aria-label="Search cards"
            className="field-term pl-9 text-[11px] tracking-[0.15em]"
          />
        </div>
      </div>

      {/* loading skeleton */}
      {loading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="h-72 animate-pulse border border-matrix/10 bg-matrix/[0.02] p-5"
              aria-hidden="true"
            >
              <div className="h-3 w-24 bg-matrix/10" />
              <div className="mt-3 h-2 w-40 bg-matrix/5" />
              <div className="mt-8 h-7 w-28 bg-matrix/10" />
              <div className="mt-8 space-y-2">
                <div className="h-2 w-full bg-white/5" />
                <div className="h-2 w-3/4 bg-white/5" />
                <div className="h-2 w-2/3 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* fetch failure */}
      {!loading && error ? (
        <Panel accent="alert" label="vault_offline" className="mt-8 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 font-mono text-[11px] leading-relaxed tracking-[0.12em] text-[#ff849b] uppercase">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              cards_unreachable :: {error}
            </p>
            <TermButton variant="alert" className="px-4 py-2" onClick={refresh}>
              RETRY_SYNC
            </TermButton>
          </div>
        </Panel>
      ) : null}

      {/* grid */}
      {!loading && !error ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => {
            const accent = accentFor(card)
            const soldOut = card.stockStatus === 'out_of_stock'
            return (
              <Panel
                key={card.id}
                accent={accent.panel}
                className="flex flex-col p-5 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className={`font-mono text-base font-bold tracking-[0.2em] ${accent.text}`}>
                      {card.name}
                    </h2>
                    <p className="mt-1 font-mono text-[10px] tracking-[0.22em] text-ash/50 uppercase">
                      {card.tagline || 'issuer slot'}
                    </p>
                  </div>
                  <span className={`chip ${soldOut ? 'chip-alert' : ''}`}>
                    {soldOut ? 'SOLD OUT' : 'IN STOCK'}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between border-y border-white/5 py-4">
                  <div>
                    <p className="hud text-[8px]">mint_fee</p>
                    <p className={`mt-1 font-mono text-2xl font-bold tracking-tight ${accent.text}`}>
                      {usd(card.priceUsd)}
                      <span className="ml-1 text-[10px] tracking-[0.2em] text-ash/50">USDT</span>
                    </p>
                  </div>
                  <span className={`border px-2 py-1 font-mono text-[9px] tracking-[0.25em] ${accent.border} ${accent.text}`}>
                    {card.brand}
                  </span>
                </div>

                <dl className="mt-4 space-y-2 font-mono text-[10.5px] tracking-[0.12em]">
                  {card.loadLimit ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ash/45 uppercase">load_limit</dt>
                      <dd className="text-bone/75">{card.loadLimit}</dd>
                    </div>
                  ) : null}
                  {card.monthlyLimit ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ash/45 uppercase">monthly</dt>
                      <dd className="text-bone/75">{card.monthlyLimit}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ash/45 uppercase">status</dt>
                    <dd className={soldOut ? 'text-[#ff849b]' : 'text-matrix/80'}>
                      {card.stockStatus}
                    </dd>
                  </div>
                </dl>

                {card.perks.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {card.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-center gap-1 border border-white/10 px-2 py-1 font-mono text-[9.5px] tracking-[0.15em] text-ash/60 uppercase"
                      >
                        <Check className="h-2.5 w-2.5 text-matrix/70" aria-hidden="true" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto pt-5">
                  <TermButton
                    className="w-full"
                    prompt="&gt;"
                    variant={soldOut ? 'ghost' : 'matrix'}
                    disabled={soldOut}
                    onClick={() => setSelected(card)}
                  >
                    {soldOut ? 'SOLD OUT' : 'BUY NOW'}
                  </TermButton>
                </div>
              </Panel>
            )
          })}
        </div>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <Panel accent="alert" label="no_match" className="mt-8 p-8 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-[#ff849b] uppercase">
            0 results — try widening the grep or the filter
          </p>
        </Panel>
      ) : null}

      <Panel label="payment_rails" className="mt-10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono text-sm font-bold tracking-[0.2em]">ACCEPTED_TOKENS</h2>
            <p className="mt-2 max-w-md font-mono text-[11px] leading-relaxed text-ash/60">
              Send USDT over BEP20 or Solana, paste the transaction hash at
              checkout, and an admin releases the card once it confirms on-chain.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['USDT - BEP20', 'USDT - SOLANA'].map((token) => (
              <span key={token} className="chip whitespace-nowrap">
                {token}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <CheckoutDialog
        key={selected?.id ?? 'closed'}
        card={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
