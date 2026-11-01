import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  AlertTriangle,
  ImageOff,
  Loader2,
  Package,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { Panel } from './GlitchText'
import { TermButton } from './TermButton'
import { useToast } from '../hooks/useToast'
import {
  createCardUnits,
  errorMessage,
  fetchCardUnits,
  fetchCards,
  uploadCardImage,
} from '../lib/api'
import type { Card, CardUnit } from '../types/db'

const usd = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * INVENTORY_MANAGEMENT — loads real card material into `card_units`.
 * Every pasted line becomes one sellable unit; the uploaded screenshot goes to
 * the `card-images` storage bucket and its public URL is stored in
 * `delivery_details` together with the pasted text.
 */
export function InventoryManager() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [cards, setCards] = useState<Card[] | null>(null)
  const [cardsError, setCardsError] = useState<string | null>(null)

  const [cardId, setCardId] = useState('')
  const [unitRows, setUnitRows] = useState<{ cardId: string; rows: CardUnit[] } | null>(null)
  const [unitFailure, setUnitFailure] = useState<{ cardId: string; message: string } | null>(null)
  const [nonce, setNonce] = useState(0)

  const [details, setDetails] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileNonce, setFileNonce] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /* ---------- card products ------------------------------------------------ */
  useEffect(() => {
    let cancelled = false
    fetchCards()
      .then((rows) => {
        if (cancelled) return
        setCards(rows)
        setCardsError(null)
        setCardId((current) => current || (rows[0]?.id ?? ''))
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setCards([])
        setCardsError(errorMessage(caught))
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  /* ---------- units for the selected product ------------------------------- */
  useEffect(() => {
    if (!cardId) return

    let cancelled = false
    fetchCardUnits(cardId)
      .then((rows) => {
        if (cancelled) return
        setUnitRows({ cardId, rows })
        setUnitFailure(null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setUnitRows({ cardId, rows: [] })
        setUnitFailure({ cardId, message: errorMessage(caught) })
      })

    return () => {
      cancelled = true
    }
  }, [cardId, nonce])

  /* ---------- release the local screenshot preview on change/unmount ------- */
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const parsedLines = useMemo(
    () =>
      details
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [details],
  )

  const selectedCard = useMemo(
    () => (cards ?? []).find((card) => card.id === cardId) ?? null,
    [cards, cardId],
  )

  const units = unitRows && unitRows.cardId === cardId ? unitRows.rows : null
  const unitsError = unitFailure && unitFailure.cardId === cardId ? unitFailure.message : null
  const loadingUnits = Boolean(cardId) && units === null && !unitsError

  const available = useMemo(() => (units ?? []).filter((unit) => !unit.sold), [units])

  const loadingCards = cards === null && !cardsError

  function resetFile() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setFileNonce((value) => value + 1)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null
    if (preview) URL.revokeObjectURL(preview)
    setFile(picked)
    setPreview(picked ? URL.createObjectURL(picked) : null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!cardId) {
      setFormError('card_required — select a card product first')
      return
    }
    if (parsedLines.length === 0) {
      setFormError('details_required — paste at least one line of card details')
      return
    }

    setSubmitting(true)
    try {
      const imageUrl = file ? await uploadCardImage(file) : null
      const inserted = await createCardUnits(cardId, parsedLines, imageUrl)
      toast.push(
        `${inserted} card unit${inserted === 1 ? '' : 's'} pushed to inventory`,
        'success',
      )
      setDetails('')
      resetFile()
      setNonce((value) => value + 1)
    } catch (caught) {
      const message = errorMessage(caught)
      setFormError(`upload_failed :: ${message}`)
      toast.push(`inventory upload failed :: ${message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Panel label="inventory_upload" className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
                UPLOAD_CARD_UNITS
              </h2>
              <p className="mt-2 max-w-xl font-mono text-[10.5px] leading-relaxed text-ash/55">
                Paste the real card material (one card per line), attach a screenshot if you
                have one, and every line is written to
                <span className="text-matrix/80"> card_units </span>
                as an unsold unit of the selected product.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="chip">
                <Package className="h-3 w-3" aria-hidden="true" />
                {available.length} available
              </span>
              <span className="chip">{units?.length ?? 0} total</span>
            </div>
          </div>

          <div className="divider-term" />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div>
                <label htmlFor="inventory-card" className="field-label">
                  card_product
                </label>
                <select
                  id="inventory-card"
                  value={cardId}
                  onChange={(event) => setCardId(event.target.value)}
                  disabled={submitting || loadingCards || (cards?.length ?? 0) === 0}
                  className="field-term cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingCards ? <option value="">loading products…</option> : null}
                  {!loadingCards && (cards?.length ?? 0) === 0 ? (
                    <option value="">no card products found</option>
                  ) : null}
                  {(cards ?? []).map((card) => (
                    <option key={card.id} value={card.id} className="bg-void text-matrix">
                      {card.name} · {usd(card.priceUsd)} USDT
                    </option>
                  ))}
                </select>
                {selectedCard ? (
                  <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
                    {selectedCard.brand} · #{selectedCard.id.slice(0, 8)} · {selectedCard.stockStatus}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="inventory-image" className="field-label">
                  card_image (optional)
                </label>
                <input
                  id="inventory-image"
                  key={fileNonce}
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  disabled={submitting}
                  className="w-full cursor-pointer border border-matrix/20 bg-black/70 px-3 py-2 font-mono text-[10px] text-ash/70 file:mr-3 file:cursor-pointer file:border file:border-matrix/40 file:bg-matrix/10 file:px-2.5 file:py-1 file:font-mono file:text-[9px] file:tracking-[0.2em] file:text-matrix file:uppercase hover:border-matrix/35 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {preview ? (
                  <div className="mt-2 flex items-start gap-2">
                    <img
                      src={preview}
                      alt="selected card screenshot"
                      className="h-20 w-32 border border-matrix/25 object-cover"
                    />
                    <TermButton
                      variant="ghost"
                      className="px-2 py-1 text-[8px]"
                      onClick={resetFile}
                      disabled={submitting}
                    >
                      CLEAR
                    </TermButton>
                  </div>
                ) : (
                  <p className="mt-1.5 font-mono text-[9px] leading-relaxed tracking-[0.18em] text-ash/35 uppercase">
                    uploaded to storage://card-images · public url saved in delivery_details
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="inventory-details" className="field-label">
                card_details · one per line
              </label>
              <textarea
                id="inventory-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={8}
                spellCheck={false}
                disabled={submitting}
                placeholder={
                  '4021 0000 0000 4021 | 09/29 | 417 | J. DOE\n5354 2222 1111 9999 | 04/30 | 882 | A. SMITH'
                }
                className="field-term min-h-40 resize-y text-[11px] leading-relaxed disabled:opacity-60"
              />
              <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
                parsed_lines :: {parsedLines.length}
              </p>
            </div>
          </div>

          {formError ? (
            <p
              role="alert"
              className="flex items-start gap-2 border border-alert/40 bg-alert/5 px-3 py-2 font-mono text-[10px] tracking-[0.15em] text-[#ff849b] uppercase"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
              each line → one unsold card_unit
            </p>
            <TermButton
              type="submit"
              className="px-4 py-2"
              disabled={submitting || !cardId || parsedLines.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  UPLOADING…
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  ADD_TO_INVENTORY
                </>
              )}
            </TermButton>
          </div>
        </form>
      </Panel>

      {cardsError ? (
        <Panel accent="alert" label="products_unreachable" className="p-5">
          <p className="flex items-start gap-2 font-mono text-[11px] leading-relaxed tracking-[0.12em] text-[#ff849b] uppercase">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            cards_unreachable :: {cardsError}
          </p>
          <TermButton
            variant="alert"
            className="mt-4 px-4 py-2"
            onClick={() => setNonce((value) => value + 1)}
          >
            RETRY
          </TermButton>
        </Panel>
      ) : null}

      <Panel label="available_units" className="p-0">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
            AVAILABLE_CARD_UNITS
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCard ? <span className="chip">{selectedCard.name}</span> : null}
            <TermButton
              variant="ghost"
              className="px-3 py-1.5 text-[9px]"
              onClick={() => setNonce((value) => value + 1)}
              disabled={loadingUnits || !cardId}
            >
              <RefreshCw
                className={`h-3 w-3 ${loadingUnits ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              REFRESH
            </TermButton>
          </div>
        </div>

        {unitsError ? (
          <p className="flex items-start gap-2 border-t border-white/5 px-4 py-6 font-mono text-[11px] leading-relaxed tracking-[0.12em] text-[#ff849b] uppercase">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            units_unreachable :: {unitsError}
          </p>
        ) : null}

        {!unitsError && (loadingUnits || units === null) ? (
          <div className="flex items-center gap-2 border-t border-white/5 px-4 py-8 font-mono text-[11px] tracking-[0.25em] text-matrix/50 uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            querying card_units…
          </div>
        ) : null}

        {!unitsError && !loadingUnits && units !== null && available.length === 0 ? (
          <p className="border-t border-white/5 px-4 py-8 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
            {cardId ? 'no unsold units for this product yet' : 'select a card product first'}
          </p>
        ) : null}

        {!unitsError && available.length > 0 ? (
          <div className="overflow-x-auto border-t border-white/5">
            <table className="table-term">
              <thead>
                <tr>
                  <th scope="col">preview</th>
                  <th scope="col">unit id</th>
                  <th scope="col">delivery_details</th>
                  <th scope="col">added</th>
                  <th scope="col" className="text-right">status</th>
                </tr>
              </thead>
              <tbody>
                {available.map((unit) => (
                  <tr key={unit.id}>
                    <td className="whitespace-nowrap">
                      {unit.imageUrl ? (
                        <a
                          href={unit.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="open full screenshot"
                          className="inline-block cursor-pointer border border-matrix/25 transition-colors hover:border-matrix/60"
                        >
                          <img
                            src={unit.imageUrl}
                            alt={`card unit ${unit.id.slice(0, 8)}`}
                            loading="lazy"
                            className="h-10 w-16 object-cover"
                          />
                        </a>
                      ) : (
                        <span className="inline-flex h-10 w-16 items-center justify-center border border-white/10 text-ash/30">
                          <ImageOff className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-matrix/50" title={unit.id}>
                      {unit.id.slice(0, 8)}…
                    </td>
                    <td className="max-w-[18rem]">
                      <p
                        className="truncate font-mono text-[10.5px] text-bone/80"
                        title={unit.details || undefined}
                      >
                        {unit.details || '—'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-ash/45">
                      {formatDate(unit.createdAt)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="chip">unsold</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9px] tracking-[0.18em] text-ash/40 uppercase">
            card_units · admin-only · unsold rows only
          </p>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ash/30 uppercase">
            {available.length} deliverable / {units?.length ?? 0} loaded
          </p>
        </div>
      </Panel>
    </div>
  )
}
