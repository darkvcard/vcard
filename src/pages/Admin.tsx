import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton } from '../components/TermButton'
import { useToast } from '../hooks/useToast'
import { errorMessage, fetchOrders, resolvePayment } from '../lib/api'
import type { Order, OrderStatus } from '../types/db'

const usd = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusStyles: Record<OrderStatus, string> = {
  pending: 'text-[#d9aaff] border-neon/40',
  completed: 'text-matrix border-matrix/40',
  failed: 'text-[#ff849b] border-alert/50',
}

function shortId(id: string) {
  return id ? `${id.slice(0, 8)}…` : '—'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

export function Admin() {
  const toast = useToast()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [approving, setApproving] = useState<string | null>(null)

  const loading = orders === null && !error

  useEffect(() => {
    let cancelled = false
    fetchOrders()
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
  }, [nonce])

  const refresh = useCallback(() => {
    setRefreshing(true)
    setNonce((value) => value + 1)
  }, [])

  const metrics = useMemo(() => {
    const rows = orders ?? []
    const completed = rows.filter((order) => order.status === 'completed')
    return {
      pending: rows.filter((order) => order.status === 'pending').length,
      completed: completed.length,
      failed: rows.filter((order) => order.status === 'failed').length,
      volume: completed.reduce((sum, order) => sum + order.amountUsd, 0),
      operators: new Set(rows.map((order) => order.userId)).size,
    }
  }, [orders])

  async function approve(order: Order) {
    setApproving(order.id)
    try {
      await resolvePayment(order.id, true)
      toast.push(`order ${shortId(order.id)} approved — card released`, 'success')
      setNonce((value) => value + 1)
    } catch (caught) {
      toast.push(`approval failed :: ${errorMessage(caught)}`, 'error')
    } finally {
      setApproving(null)
    }
  }

  async function copyTxid(txid: string) {
    try {
      await navigator.clipboard.writeText(txid)
      toast.push('txid copied', 'success')
    } catch {
      toast.push('clipboard blocked by the browser', 'error')
    }
  }

  return (
    <div className="animate-rise">
      {/* restricted banner */}
      <div className="flex flex-col gap-3 border border-alert/40 bg-alert/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-[#ff849b] uppercase">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          restricted_area · access_level: root · all actions audited
        </p>
        <span className="chip chip-alert">clearance verified</span>
      </div>

      <header className="mt-8 flex flex-col gap-4 border-b border-matrix/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hud">// control_room</p>
          <GlitchText
            as="h1"
            text="ADMIN_CONSOLE"
            className="mt-3 font-mono text-3xl font-extrabold tracking-tighter sm:text-4xl"
          />
          <p className="mt-2 max-w-lg font-mono text-[11px] leading-relaxed text-ash/55">
            Payment queue and issuer oversight. Approving an order calls the
            <span className="text-matrix/80"> resolve_payment </span>
            RPC, which flips the order and releases the delivered card.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TermButton variant="ghost" className="px-4 py-2" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            REFRESH
          </TermButton>
          <span className="chip">orders :: {orders?.length ?? 0}</span>
        </div>
      </header>

      {/* metrics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Wallet, label: 'settled_volume', value: usd(metrics.volume), unit: 'USDT' },
          { icon: Loader2, label: 'pending_approvals', value: String(metrics.pending), unit: 'orders', accent: metrics.pending > 0 },
          { icon: CheckCircle2, label: 'completed', value: String(metrics.completed), unit: 'orders' },
          { icon: Users, label: 'operators', value: String(metrics.operators), unit: 'unique' },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <Panel
              key={metric.label}
              accent={metric.accent ? 'alert' : 'matrix'}
              className="p-5"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center border ${
                  metric.accent
                    ? 'border-alert/40 bg-alert/10 text-[#ff849b]'
                    : 'border-matrix/30 bg-matrix/5 text-matrix'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mt-4 hud text-[8px]">{metric.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-bone/90">
                {metric.value}
                <span className="ml-1.5 text-[9px] tracking-[0.2em] text-ash/40 uppercase">
                  {metric.unit}
                </span>
              </p>
            </Panel>
          )
        })}
      </div>

      {/* orders table */}
      <div className="mt-6">
        <Panel label="payment_queue" className="p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
              ALL_ORDERS
            </h2>
            <span className="hud">live feed · {metrics.failed} failed</span>
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
            <p className="border-t border-white/5 px-4 py-8 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
              queue empty — no orders submitted yet
            </p>
          ) : null}

          {!loading && !error && (orders?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto border-t border-white/5">
              <table className="table-term">
                <thead>
                  <tr>
                    <th scope="col">order id</th>
                    <th scope="col">user id</th>
                    <th scope="col">card</th>
                    <th scope="col">crypto method</th>
                    <th scope="col">txid</th>
                    <th scope="col">status</th>
                    <th scope="col" className="text-right">actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders ?? []).map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap text-matrix/50" title={order.id}>
                        {shortId(order.id)}
                      </td>
                      <td className="whitespace-nowrap text-ash/60" title={order.userId}>
                        {shortId(order.userId)}
                      </td>
                      <td className="whitespace-nowrap text-bone/85">
                        {order.cardName ?? '—'}
                        <span className="ml-2 text-[9px] text-ash/35">{usd(order.amountUsd)}</span>
                      </td>
                      <td className="whitespace-nowrap text-ash/60">{order.cryptoMethod ?? '—'}</td>
                      <td className="max-w-[14rem]">
                        {order.txid ? (
                          <button
                            type="button"
                            onClick={() => void copyTxid(order.txid ?? '')}
                            title={order.txid}
                            className="flex max-w-full cursor-pointer items-center gap-1.5 font-mono text-[10px] text-ash/55 transition-colors hover:text-matrix"
                          >
                            <span className="truncate">{order.txid}</span>
                            <ClipboardCopy className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="text-ash/35">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={`inline-block border px-2 py-0.5 text-[9px] tracking-[0.18em] uppercase ${statusStyles[order.status]}`}
                        >
                          {order.status}
                        </span>
                        <span className="ml-2 hidden text-[9px] text-ash/30 lg:inline">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {order.status === 'pending' ? (
                          <TermButton
                            className="px-3 py-1.5 text-[9px]"
                            onClick={() => void approve(order)}
                            disabled={approving === order.id}
                            aria-label={`Approve order ${order.id}`}
                          >
                            {approving === order.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                SENDING
                              </>
                            ) : (
                              'APPROVE'
                            )}
                          </TermButton>
                        ) : order.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] text-matrix/50 uppercase">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] text-[#ff849b]/70 uppercase">
                            <XCircle className="h-3 w-3" aria-hidden="true" /> rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-ash/40 uppercase">
              <ShieldCheck className="h-3 w-3 text-matrix/60" aria-hidden="true" />
              resolve_payment is SECURITY DEFINER · row level security enforced
            </p>
            <p className="font-mono text-[9px] tracking-[0.18em] text-ash/30 uppercase">
              approve → status=completed + delivery_details
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
