import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton, TermLink } from '../components/TermButton'
import { VirtualCard } from '../components/VirtualCard'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { errorMessage, fetchOrders, deliveryImageUrl, deliveryText } from '../lib/api'
import type { DeliveryDetails, Order, OrderStatus } from '../types/db'

const usd = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusStyles: Record<OrderStatus, string> = {
  pending: 'border-neon/40 bg-neon/5 text-[#d9aaff]',
  completed: 'border-matrix/40 bg-matrix/5 text-matrix',
  failed: 'border-alert/50 bg-alert/5 text-[#ff849b]',
}

const statusIcons = {
  pending: Clock,
  completed: CheckCircle2,
  failed: XCircle,
} as const

const DELIVERY_KEYS: Record<string, string[]> = {
  card_number: ['card_number', 'number', 'pan', 'card_no'],
  expiry: ['expiry', 'exp', 'exp_date', 'valid_thru'],
  cvc: ['cvc', 'cvv', 'cvn', 'security_code'],
  brand: ['brand', 'network', 'scheme'],
  holder: ['holder', 'name', 'card_holder'],
}

function readDelivery(details: DeliveryDetails, field: keyof typeof DELIVERY_KEYS): string | null {
  if (!details || typeof details !== 'object') return null
  for (const key of DELIVERY_KEYS[field]) {
    const value = (details as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return null
}

const digits = (value: string | null) => (value ? value.replace(/\D/g, '') : '')

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * `orders` only stores `card_id`; `fetchOrders` already resolves the product
 * name from `cards`. Fall back to the short id (never a bare UNKNOWN_CARD)
 * when the row was deleted from the catalog.
 */
function orderCardLabel(order: Order): string {
  if (order.cardName) return order.cardName
  return order.cardId ? `CARD_${order.cardId.slice(0, 8).toUpperCase()}` : 'UNKNOWN_CARD'
}

export function Dashboard() {
  const { user } = useAuth()
  const toast = useToast()

  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)

  // `null` means "not loaded yet" - no separate loading flag to keep in sync.
  const loading = orders === null && !error

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchOrders(user.id)
      .then((rows) => {
        if (cancelled) return
        setOrders(rows)
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
  }, [user, nonce])

  const refresh = useCallback(() => {
    setRefreshing(true)
    setNonce((value) => value + 1)
  }, [])

  const stats = useMemo(() => {
    const rows = orders ?? []
    const completed = rows.filter((order) => order.status === 'completed')
    return {
      total: rows.length,
      pending: rows.filter((order) => order.status === 'pending').length,
      completed: completed.length,
      spent: completed.reduce((sum, order) => sum + order.amountUsd, 0),
    }
  }, [orders])

  const delivered = useMemo(
    () => (orders ?? []).find((order) => order.status === 'completed' && order.deliveryDetails),
    [orders],
  )

  const holder = user?.email?.split('@')[0]?.toUpperCase() ?? 'ANON_OPERATOR'
  const last4 = digits(readDelivery(delivered?.deliveryDetails ?? null, 'card_number')).slice(-4)
  const expiry = readDelivery(delivered?.deliveryDetails ?? null, 'expiry') ?? '--/--'

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.push(`${label} copied`, 'success')
    } catch {
      toast.push('clipboard blocked by the browser', 'error')
    }
  }

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-4 border-b border-matrix/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hud">// operator_console</p>
          <GlitchText
            as="h1"
            text="DASHBOARD"
            className="mt-3 font-mono text-3xl font-extrabold tracking-tighter sm:text-4xl"
          />
          <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
            operator :: {user?.email ?? 'unknown'} · role :: {user?.role ?? 'guest'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TermButton variant="ghost" className="px-3 py-2 text-[9px]" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            REFRESH
          </TermButton>
          <TermLink to="/shop" prompt="&gt;" variant="neon" className="px-4 py-2">
            MINT_NEW
          </TermLink>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <VirtualCard
            holder={holder}
            last4={last4 || '----'}
            expiry={expiry}
            tier={delivered?.cardName ?? 'AWAITING'}
            balance={`${usd(stats.spent)}`}
          />

          <Panel label="your_orders" className="p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
                ORDER_LOG
              </h2>
              <span className="hud">{stats.total} record(s)</span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 border-t border-white/5 px-4 py-10 font-mono text-[11px] tracking-[0.25em] text-matrix/50 uppercase">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                querying orders…
              </div>
            ) : null}

            {!loading && error ? (
              <div className="border-t border-white/5 px-4 py-6">
                <p className="flex items-start gap-2 font-mono text-[11px] tracking-[0.12em] text-[#ff849b] uppercase">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  orders_unreachable :: {error}
                </p>
                <TermButton variant="alert" className="mt-4 px-4 py-2" onClick={refresh}>
                  RETRY
                </TermButton>
              </div>
            ) : null}

            {!loading && !error && (orders?.length ?? 0) === 0 ? (
              <div className="border-t border-white/5 px-4 py-10 text-center">
                <CreditCard className="mx-auto h-6 w-6 text-matrix/40" aria-hidden="true" />
                <p className="mt-3 font-mono text-[11px] tracking-[0.2em] text-ash/55 uppercase">
                  no orders yet — mint your first card
                </p>
                <Link to="/shop" className="term-btn mt-5 inline-flex px-5 py-2.5">
                  <span className="term-btn__prompt" aria-hidden="true">
                    &gt;
                  </span>
                  BROWSE_VAULT
                </Link>
              </div>
            ) : null}

            {!loading && !error ? (
              <ul className="divide-y divide-white/5 border-t border-white/5">
                {(orders ?? []).map((order) => {
                  const Icon = statusIcons[order.status]
                  const details = order.deliveryDetails
                  const isObject = details && typeof details === 'object'
                  const unitText = deliveryText(details)
                  const unitImage = deliveryImageUrl(details)
                  return (
                    <li key={order.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[12px] font-bold tracking-[0.18em] text-bone/90">
                            {orderCardLabel(order)}
                          </p>
                          <p className="mt-1 font-mono text-[9.5px] tracking-[0.18em] text-ash/45 uppercase">
                            #{order.id.slice(0, 8)} · {order.cryptoMethod ?? 'n/a'} ·{' '}
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-bone/85">
                            {usd(order.amountUsd)} <span className="text-[9px] text-ash/40">USDT</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] uppercase ${statusStyles[order.status]}`}
                          >
                            <Icon className="h-2.5 w-2.5" aria-hidden="true" />
                            {order.status}
                          </span>
                        </div>
                      </div>

                      {order.txid ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="hud text-[8px] text-matrix/35">txid</span>
                          <code className="truncate font-mono text-[9.5px] text-ash/50">
                            {order.txid}
                          </code>
                          <button
                            type="button"
                            onClick={() => void copy(order.txid ?? '', 'txid')}
                            aria-label="Copy transaction hash"
                            className="cursor-pointer text-ash/40 transition-colors hover:text-matrix"
                          >
                            <ClipboardCopy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null}

                      {order.status === 'completed' && details ? (
                        <div className="mt-3 border border-matrix/30 bg-matrix/[0.04] p-3">
                          <p className="hud text-[8px] text-matrix/50">delivered_card_details</p>
                          {unitText ? (
                            <p className="mt-2 font-mono text-[10.5px] leading-relaxed break-words whitespace-pre-wrap text-matrix/85">
                              {unitText}
                            </p>
                          ) : null}
                          {unitImage ? (
                            <a
                              href={unitImage}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block border border-matrix/25 transition-colors hover:border-matrix/60"
                            >
                              <img
                                src={unitImage}
                                alt="delivered card screenshot"
                                loading="lazy"
                                className="max-h-40 w-auto object-contain"
                              />
                            </a>
                          ) : null}
                          {!unitText && !unitImage && isObject ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {(
                                [
                                  ['card_number', readDelivery(details, 'card_number')],
                                  ['expiry', readDelivery(details, 'expiry')],
                                  ['cvc', readDelivery(details, 'cvc')],
                                  ['brand', readDelivery(details, 'brand')],
                                ] as const
                              ).map(([label, value]) =>
                                value ? (
                                  <div key={label} className="flex items-center justify-between gap-2 border-b border-white/5 pb-1">
                                    <span className="font-mono text-[9px] tracking-[0.2em] text-ash/45 uppercase">
                                      {label.replace('_', ' ')}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => void copy(value, label)}
                                      className="flex cursor-pointer items-center gap-1.5 font-mono text-[10.5px] tracking-[0.12em] text-matrix transition-opacity hover:opacity-70"
                                      title={`copy ${label}`}
                                    >
                                      {value}
                                      <ClipboardCopy className="h-2.5 w-2.5" aria-hidden="true" />
                                    </button>
                                  </div>
                                ) : null,
                              )}
                            </div>
                          ) : !unitText && !unitImage ? (
                            <p className="mt-2 font-mono text-[10.5px] leading-relaxed break-all text-matrix/85">
                              {String(details)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {order.status === 'pending' ? (
                        <p className="mt-2 font-mono text-[9px] tracking-[0.18em] text-[#d9aaff]/70 uppercase">
                          awaiting on-chain verification by an admin
                        </p>
                      ) : null}
                      {order.status === 'failed' ? (
                        <p className="mt-2 font-mono text-[9px] tracking-[0.18em] text-[#ff849b]/80 uppercase">
                          verification failed — open a ticket with the txid above
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </Panel>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <Panel label="account" className="p-5">
            <p className="hud">settled_spend</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-matrix text-glow">
              {usd(stats.spent)}
              <span className="ml-2 text-[10px] tracking-[0.25em] text-ash/45">USDT</span>
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ash/45 uppercase">
              across {stats.completed} completed order{stats.completed === 1 ? '' : 's'}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
              {[
                { label: 'orders', value: stats.total },
                { label: 'pending', value: stats.pending },
                { label: 'delivered', value: stats.completed },
              ].map((item) => (
                <div key={item.label}>
                  <p className="hud text-[8px]">{item.label}</p>
                  <p className="mt-1 font-mono text-lg font-bold text-bone/85">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="divider-term my-4" />

            <dl className="space-y-2 font-mono text-[10px] tracking-[0.15em] uppercase">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ash/40">clearance</dt>
                <dd className={user?.role === 'admin' ? 'text-[#d9aaff]' : 'text-matrix/80'}>
                  {user?.role ?? 'guest'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ash/40">operator_id</dt>
                <dd className="truncate text-bone/60">{user?.id.slice(0, 8) ?? '—'}</dd>
              </div>
            </dl>
          </Panel>

          <Panel accent="neon" label="settlement" className="p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#d9aaff]" aria-hidden="true" />
              <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-[#d9aaff]">
                USDT RAILS
              </h2>
            </div>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-ash/65">
              Payments settle in USDT over BEP20 or Solana. Submit the transaction
              hash at checkout and an admin releases the card once it is verified.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip chip-neon">BEP20</span>
              <span className="chip chip-neon">SOLANA</span>
            </div>
            <TermLink to="/shop" variant="ghost" className="mt-5 w-full py-2.5 text-[9px]">
              OPEN_CHECKOUT
            </TermLink>
          </Panel>

          {delivered ? (
            <Panel accent="matrix" label="latest_delivery" className="p-5">
              <p className="hud text-[8px]">card</p>
              <p className="mt-1 font-mono text-sm font-bold tracking-[0.2em] text-matrix">
                {orderCardLabel(delivered)}
              </p>
              <p className="mt-3 font-mono text-[10px] tracking-[0.18em] text-ash/55 uppercase">
                order #{delivered.id.slice(0, 8)} · {usd(delivered.amountUsd)} USDT
              </p>
              <Link
                to="/dashboard"
                className="mt-3 inline-block font-mono text-[9px] tracking-[0.2em] text-matrix/60 uppercase underline decoration-matrix/30 underline-offset-4 transition-colors hover:text-matrix"
              >
                details above ↑
              </Link>
            </Panel>
          ) : (
            <Panel label="latest_delivery" className="p-5 text-center">
              <CreditCard className="mx-auto h-5 w-5 text-matrix/35" aria-hidden="true" />
              <p className="mt-2 font-mono text-[10px] tracking-[0.2em] text-ash/45 uppercase">
                no card delivered yet
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
