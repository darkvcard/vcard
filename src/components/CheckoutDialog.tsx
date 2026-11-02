import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Check,
  ClipboardCopy,
  Coins,
  Loader2,
  ShieldAlert,
  X,
} from 'lucide-react'
import { Panel } from './GlitchText'
import { TermButton } from './TermButton'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { createOrder, errorMessage } from '../lib/api'
import { CRYPTO_METHODS, getCryptoMethod } from '../lib/crypto'
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

/**
 * The raw Supabase row is the source of truth for the checkout header: rows use
 * `card_name` / `price_in_usd`, and older fixtures use `name` / `price_usd`.
 * Falling back to the raw row keeps the dialog from ever printing
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

  return {
    name:
      card.name && card.name !== 'UNNAMED_CARD'
        ? card.name
        : rawName
          ? rawName.trim().toUpperCase()
          : 'CARD',
    priceUsd: card.priceUsd > 0 ? card.priceUsd : (rawPrice ?? 0),
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

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
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
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close checkout"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain px-1 py-3"
      >
        <Panel label="checkout_terminal" className="relative p-4 sm:p-6 md:p-7">
          <div className="scan-sweep" aria-hidden="true" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="hud">// order_intent</p>
              <h2
                id="checkout-title"
                className="mt-1 truncate font-mono text-base font-bold tracking-[0.2em] text-matrix sm:text-lg"
              >
                {view.name}
              </h2>
              <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ash/50 uppercase">
                {card.brand} · settles in USDT
              </p>
            </div>
            <div className="flex items-start justify-between gap-3 sm:justify-end">
              <div className="text-left sm:text-right">
                <p className="hud text-[8px] text-matrix/40">amount_due</p>
                <p className="font-mono text-lg font-bold text-matrix text-glow sm:text-xl">
                  {usd(view.priceUsd)}
                  <span className="ml-1 text-[9px] tracking-[0.2em] text-ash/50">USDT</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close checkout"
                className="cursor-pointer border border-white/10 p-1.5 text-ash/60 transition-colors hover:border-alert/50 hover:text-[#ff849b]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="divider-term my-5" />

          <div className="grid gap-5 sm:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
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
                  <p className="font-mono text-[10.5px] leading-relaxed break-all text-matrix/90">
                    {method.address}
                  </p>
                  <p className="mt-2 font-mono text-[8.5px] tracking-[0.2em] text-ash/40 uppercase">
                    {method.network} · {method.confirmations} confirmation
                    {method.confirmations > 1 ? 's' : ''}
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
            </div>

            <div className="flex flex-col items-center justify-start gap-2 border border-matrix/20 bg-black/50 p-3">
              <QRCodeSVG
                value={method.address}
                size={148}
                bgColor="#050505"
                fgColor="#00ff41"
                level="M"
                className="h-auto w-full max-w-[148px]"
                title={`${method.label} deposit address`}
              />
              <p className="hud text-[8px] text-matrix/40">scan_to_pay</p>
            </div>
          </div>

          <div className="mt-5">
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
              send exactly {usd(view.priceUsd)} USDT, then paste the hash · verifier checks it manually
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 border border-alert/40 bg-alert/5 px-3 py-2 font-mono text-[10px] tracking-[0.15em] text-[#ff849b] uppercase"
            >
              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <TermButton
              className="flex-1 py-3"
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
            <TermButton variant="ghost" className="sm:w-32" onClick={onClose} disabled={submitting}>
              ABORT
            </TermButton>
          </div>

          <p className="mt-3 font-mono text-[8.5px] leading-relaxed tracking-[0.18em] text-ash/30 uppercase">
            orders are queued as pending · an admin verifies the txid on-chain before the card is delivered
          </p>
        </Panel>
      </div>
    </div>
  )
}
