import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Coins,
  Loader2,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import { TermButton } from './TermButton'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { createOrder, errorMessage } from '../lib/api'
import { CRYPTO_METHODS, getCryptoMethod } from '../lib/crypto'
import { formatBalance } from '../lib/format'
import type { CryptoMethodId } from '../lib/crypto'
import type { Card } from '../types/db'

type CheckoutDialogProps = {
  card: Card | null
  onClose: () => void
}

const usd = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function isLikelyTxid(value: string) {
  return value.trim().length >= 16
}

/* Sci-fi corner ticks used to frame the QR panel on the full-screen view. */
const cornerTicks = [
  'top-0 left-0 border-t border-l',
  'top-0 right-0 border-t border-r',
  'bottom-0 left-0 border-b border-l',
  'bottom-0 right-0 border-b border-r',
]

/**
 * The raw Supabase row is the source of truth for the checkout header: rows use
 * `card_name` / `price_in_usd`, and older fixtures use `name` / `price_usd`.
 * Falling back to the raw row keeps the view from ever printing
 * "UNNAMED_CARD" + "0.00 USDT" for a card the shop is listing.
 */
function checkoutView(card: Card) {
  const raw = (card.raw ?? {}) as Record<string, unknown>

  const rawName = ['card_name', 'name', 'title', 'tier']
    .map((key) => raw[key])
    .find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    )

  const rawPrice = ['price_in_usd', 'price_usd', 'price', 'amount_usd']
    .map((key) => Number.parseFloat(String(raw[key] ?? '')))
    .find((value) => Number.isFinite(value))

  const rawBalance = ['card_balance', 'balance', 'description', 'card_description', 'tagline']
    .map((key) => raw[key])
    .find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    )

  return {
    name:
      card.name && card.name !== 'UNNAMED_CARD'
        ? card.name
        : rawName
          ? rawName.trim().toUpperCase()
          : 'CARD',
    priceUsd: card.priceUsd > 0 ? card.priceUsd : (rawPrice ?? 0),
    balance: formatBalance(card.tagline || rawBalance),
  }
}

export function CheckoutDialog({ card, onClose }: CheckoutDialogProps) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [methodId, setMethodId] = useState<CryptoMethodId>('USDT_BEP20')
  const [txid, setTxid] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const txidRef = useRef<HTMLInputElement>(null)

  const method = useMemo(() => getCryptoMethod(methodId), [methodId])
  const open = Boolean(card)

  /*
   * Full-screen view, not a modal: nothing is locked, nothing is trapped.
   * Escape simply leaves the view early, exactly like pressing GO BACK.
   */
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!card) return null

  const view = checkoutView(card)
  const soldOut = card.stockStatus === 'out_of_stock'

  async function copyAddress() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(method.address)
      } else {
        const helper = document.createElement('textarea')
        helper.value = method.address
        helper.style.position = 'fixed'
        helper.style.opacity = '0'
        document.body.appendChild(helper)
        helper.select()
        document.execCommand('copy')
        document.body.removeChild(helper)
      }
      setCopied(true)
      toast.push('wallet address copied', 'success')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setError('clipboard_blocked — copy the address manually')
    }
  }

  async function handleConfirm() {
    setError(null)

    if (!user) {
      const message = 'authentication required — sign in before paying'
      setError(message)
      toast.push(message, 'error')
      onClose()
      navigate('/auth', { state: { from: '/shop' } })
      return
    }

    if (!card) return

    if (soldOut) {
      setError('card_out_of_stock')
      return
    }

    const cleanTxid = txid.trim()
    if (!cleanTxid) {
      setError('txid_required — paste the transaction hash first')
      txidRef.current?.focus()
      return
    }
    if (!isLikelyTxid(cleanTxid)) {
      setError('txid_invalid — that hash looks too short')
      txidRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      await createOrder({
        user_id: user.id,
        card_id: card.id,
        amount_usd: view.priceUsd,
        crypto_method: method.label,
        txid: cleanTxid,
        status: 'pending',
      })
      toast.push('payment submitted — awaiting confirmation', 'success')
      onClose()
      navigate('/dashboard')
    } catch (caught) {
      const message = errorMessage(caught)
      setError(`order_failed :: ${message}`)
      toast.push('order failed — check the console', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[999] w-full h-full overflow-y-auto bg-black text-white">
      <div className="min-h-full w-full max-w-2xl mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <section
          aria-labelledby="checkout-title"
          className="relative w-full border border-green-500/30 bg-black shadow-[0_0_48px_-14px_rgba(0,255,65,0.45)]"
        >
          <div className="scan-sweep" aria-hidden="true" />

          {/* ---- terminal top bar ------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="group inline-flex cursor-pointer items-center gap-2 border border-matrix/35 bg-matrix/[0.06] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.22em] text-matrix uppercase transition-colors hover:border-alert/60 hover:bg-alert/10 hover:text-[#ff849b]"
            >
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
              abort / go back
            </button>
            <p className="hud flex items-center gap-2 text-[8px] text-matrix/40">
              <Terminal className="h-3 w-3" aria-hidden="true" />
              secure_checkout
            </p>
          </div>

          {/* ---- invoice header -------------------------------------------- */}
          <header className="border-b border-white/10 px-4 py-6 sm:px-6">
            <p className="hud">// checkout_terminal</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h1
                  id="checkout-title"
                  className="font-mono text-xl font-bold tracking-[0.16em] text-matrix text-glow sm:text-2xl"
                >
                  {view.name}
                </h1>
                <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ash/50 uppercase">
                  {card.brand} · settles in USDT
                </p>
                {view.balance ? (
                  <p className="mt-3 flex flex-wrap items-baseline gap-2 font-mono">
                    <span className="text-[8px] font-bold tracking-[0.3em] text-matrix/50 uppercase">
                      BALANCE:
                    </span>
                    <span className="text-lg font-bold tracking-[0.06em] text-matrix sm:text-xl">
                      {view.balance}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="border border-matrix/25 bg-matrix/[0.04] px-4 py-2 text-right">
                <p className="hud text-[8px] text-matrix/40">amount_due</p>
                <p className="font-mono text-xl font-bold text-matrix text-glow sm:text-2xl">
                  {usd(view.priceUsd)}
                  <span className="ml-1 text-[9px] tracking-[0.2em] text-ash/50">USDT</span>
                </p>
              </div>
            </div>
          </header>

          {/* ---- payment body ---------------------------------------------- */}
          <div className="grid gap-6 px-4 py-6 sm:grid-cols-[minmax(0,196px)_minmax(0,1fr)] sm:px-6 sm:py-8">
            <div className="flex flex-col items-center gap-2">
              <p className="field-label w-full text-left">scan_to_pay</p>
              <div className="relative w-full max-w-[196px] border border-matrix/25 bg-black p-3">
                {cornerTicks.map((position) => (
                  <span
                    key={position}
                    aria-hidden="true"
                    className={`pointer-events-none absolute h-3 w-3 border-matrix/70 ${position}`}
                  />
                ))}
                <QRCodeSVG
                  value={method.address}
                  size={196}
                  bgColor="#050505"
                  fgColor="#00ff41"
                  level="M"
                  className="h-auto w-full"
                  title={`${method.label} deposit address`}
                />
              </div>
              <p className="hud text-center text-[8px] text-matrix/40">
                {method.network} · {method.confirmations} confirmation
                {method.confirmations > 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="crypto-method" className="field-label">
                  payment_rail
                </label>
                <div className="relative">
                  <Coins
                    className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-matrix/35"
                    aria-hidden="true"
                  />
                  <select
                    id="crypto-method"
                    value={methodId}
                    onChange={(event) => {
                      setMethodId(event.target.value as CryptoMethodId)
                      setCopied(false)
                    }}
                    className="field-term cursor-pointer appearance-none pr-8 pl-9"
                  >
                    {CRYPTO_METHODS.map((option) => (
                      <option key={option.id} value={option.id} className="bg-void text-matrix">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="field-label">deposit_address</p>
                <div className="border border-matrix/25 bg-black/70 px-3 py-2.5">
                  <p className="font-mono text-[11px] leading-relaxed break-all text-matrix/90">
                    {method.address}
                  </p>
                </div>
                <TermButton
                  variant="ghost"
                  className="mt-2 w-full py-2 text-[9px]"
                  onClick={() => void copyAddress()}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-matrix" aria-hidden="true" />
                  ) : (
                    <ClipboardCopy className="h-3 w-3" aria-hidden="true" />
                  )}
                  {copied ? 'COPIED' : 'COPY ADDRESS'}
                </TermButton>
              </div>

              <div>
                <label htmlFor="txid" className="field-label">
                  paste your transaction hash (txid)
                </label>
                <input
                  id="txid"
                  ref={txidRef}
                  value={txid}
                  onChange={(event) => setTxid(event.target.value)}
                  placeholder="0x9f2c…  /  5Kd3…"
                  spellCheck={false}
                  autoComplete="off"
                  className="field-term"
                />
                <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
                  send exactly {usd(view.priceUsd)} USDT, then paste the hash · verifier checks it
                  manually
                </p>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 border border-alert/40 bg-alert/5 px-3 py-2 font-mono text-[10px] tracking-[0.15em] text-[#ff849b] uppercase"
                >
                  <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {/* ---- action bar ------------------------------------------------ */}
          <div className="border-t border-white/10 px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <TermButton
                className="flex-1 py-3.5"
                prompt="&gt;"
                onClick={() => void handleConfirm()}
                disabled={submitting || soldOut}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    BROADCASTING…
                  </>
                ) : soldOut ? (
                  'SOLD OUT'
                ) : (
                  'CONFIRM PAYMENT'
                )}
              </TermButton>
              <TermButton
                variant="ghost"
                className="sm:w-36"
                onClick={onClose}
                disabled={submitting}
              >
                ABORT
              </TermButton>
            </div>

            <p className="mt-3 font-mono text-[8.5px] leading-relaxed tracking-[0.18em] text-ash/30 uppercase">
              orders are queued as pending · an admin verifies the txid on-chain before the card is
              delivered
            </p>
          </div>
        </section>

        <p className="hud mt-4 text-center text-[8px] text-matrix/25">
          // end_of_transmission · esc or abort to return to the shop
        </p>
      </div>
    </div>
  )
}

