import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  AlertTriangle,
  ImageOff,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Panel } from './GlitchText'
import { TermButton } from './TermButton'
import { useToast } from '../hooks/useToast'
import { formatBalance } from '../lib/format'
import {
  createCard,
  deleteCard,
  errorMessage,
  fetchCards,
  updateCard,
  uploadCardImage,
} from '../lib/api'
import type { Card, CardDraft, StockStatus } from '../types/db'

const BRANDS = ['VISA', 'MASTERCARD', 'AMEX'] as const

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: 'in_stock', label: 'in_stock' },
  { value: 'low_stock', label: 'low_stock' },
  { value: 'out_of_stock', label: 'out_of_stock' },
]

const STOCK_STYLES: Record<StockStatus, string> = {
  in_stock: 'chip',
  low_stock: 'chip chip-neon',
  out_of_stock: 'chip chip-alert',
}

const usd = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type FormState = {
  name: string
  brand: string
  price: string
  description: string
  stockStatus: StockStatus
}

const EMPTY_FORM: FormState = {
  name: '',
  brand: 'VISA',
  price: '',
  description: '',
  stockStatus: 'in_stock',
}

/** Original (non-uppercased) name of a mapped card row. */
function rawName(card: Card): string {
  const name = card.raw.name ?? card.raw.card_name
  return typeof name === 'string' && name.trim() ? name : card.name
}

function rawBrand(card: Card): string {
  const brand = card.brand.toUpperCase()
  return (BRANDS as readonly string[]).includes(brand) ? brand : 'VISA'
}

/**
 * PRODUCT_MANAGEMENT — the write side of `cards`.
 * The form creates (or edits) one product row; the optional artwork is uploaded
 * to the public `card-images` bucket and its public URL is saved in
 * `cards.image_url`. The table below lists every product with EDIT / DELETE.
 */
export function ProductManager() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const [cards, setCards] = useState<Card[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingImage, setEditingImage] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileNonce, setFileNonce] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirming, setConfirming] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loading = cards === null && !loadError

  useEffect(() => {
    let cancelled = false
    fetchCards()
      .then((rows) => {
        if (cancelled) return
        setCards(rows)
        setLoadError(null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setCards([])
        setLoadError(errorMessage(caught))
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  /* release the local artwork preview on change/unmount */
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const rows = useMemo(() => cards ?? [], [cards])

  const counts = useMemo(
    () => ({
      total: rows.length,
      inStock: rows.filter((card) => card.stockStatus === 'in_stock').length,
      lowStock: rows.filter((card) => card.stockStatus === 'low_stock').length,
      outOfStock: rows.filter((card) => card.stockStatus === 'out_of_stock').length,
    }),
    [rows],
  )

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

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setEditingImage(null)
    setFormError(null)
    resetFile()
  }

  function removeImage() {
    resetFile()
    setEditingImage(null)
  }

  function startEdit(card: Card) {
    setEditingId(card.id)
    setEditingImage(card.imageUrl)
    setForm({
      name: rawName(card),
      brand: rawBrand(card),
      price: String(card.priceUsd),
      description:
        typeof card.raw.description === 'string' ? card.raw.description : card.tagline,
      stockStatus: card.stockStatus,
    })
    setFormError(null)
    resetFile()
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!form.name.trim()) {
      setFormError('name_required — enter a card name')
      return
    }

    const price = Number.parseFloat(form.price)
    if (!Number.isFinite(price) || price < 0) {
      setFormError('price_invalid — enter a price in USD (0 or more)')
      return
    }

    setSubmitting(true)
    try {
      const uploaded = file ? await uploadCardImage(file) : editingImage
      const draft: CardDraft = {
        name: form.name,
        brand: form.brand,
        priceUsd: Math.round(price * 100) / 100,
        description: form.description,
        stockStatus: form.stockStatus,
        imageUrl: uploaded,
      }

      if (editingId) {
        await updateCard(editingId, draft)
        toast.push(`${form.name.trim()} updated`, 'success')
      } else {
        await createCard(draft)
        toast.push(`${form.name.trim()} added to the catalog`, 'success')
      }

      resetForm()
      setNonce((value) => value + 1)
    } catch (caught) {
      const message = errorMessage(caught)
      setFormError(`write_failed :: ${message}`)
      toast.push(`product write failed :: ${message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!confirming) return
    setDeleting(true)
    try {
      await deleteCard(confirming.id)
      toast.push(`${confirming.name} deleted`, 'success')
      if (editingId === confirming.id) resetForm()
      setConfirming(null)
      setNonce((value) => value + 1)
    } catch (caught) {
      const message = errorMessage(caught)
      toast.push(`delete failed :: ${message}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div ref={formRef} className="scroll-mt-24">
        <Panel label={editingId ? 'edit_product' : 'create_product'} className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
                  {editingId ? 'EDIT_PRODUCT' : 'CREATE_NEW_PRODUCT'}
                </h2>
                <p className="mt-2 max-w-xl font-mono text-[10.5px] leading-relaxed text-ash/55">
                  {editingId ? (
                    <>
                      Editing <span className="text-matrix/80">{form.name || 'product'}</span>.
                      Saving rewrites the <span className="text-matrix/80">cards</span> row; upload
                      a new image to replace the current artwork.
                    </>
                  ) : (
                    <>
                      Every submission inserts one row into
                      <span className="text-matrix/80"> public.cards </span>
                      and the shop picks it up immediately. Artwork is optional — without it the
                      card falls back to the CSS-drawn design.
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="chip">
                  <Package className="h-3 w-3" aria-hidden="true" />
                  {counts.total} products
                </span>
                <span className="chip chip-neon">{counts.lowStock} low</span>
              </div>
            </div>

            <div className="divider-term" />

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label htmlFor="product-name" className="field-label">
                  card_name
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Visa Platinum $100"
                  spellCheck={false}
                  disabled={submitting}
                  className="field-term disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="product-brand" className="field-label">
                  card_type
                </label>
                <select
                  id="product-brand"
                  value={form.brand}
                  onChange={(event) => setForm({ ...form, brand: event.target.value })}
                  disabled={submitting}
                  className="field-term cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand} className="bg-void text-matrix">
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="product-price" className="field-label">
                  price_usd
                </label>
                <input
                  id="product-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="100.00"
                  disabled={submitting}
                  className="field-term disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="product-stock" className="field-label">
                  stock_status
                </label>
                <select
                  id="product-stock"
                  value={form.stockStatus}
                  onChange={(event) =>
                    setForm({ ...form, stockStatus: event.target.value as StockStatus })
                  }
                  disabled={submitting}
                  className="field-term cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {STOCK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-void text-matrix">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="product-description" className="field-label">
                  card_balance
                </label>
                <input
                  id="product-description"
                  type="text"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="$100"
                  disabled={submitting}
                  className="field-term disabled:opacity-60"
                />
                <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
                  loaded value shown as <span className="text-matrix/70">BALANCE: $100</span> on the
                  shop card
                </p>
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="product-image" className="field-label">
                  card_image (optional)
                </label>
                <input
                  id="product-image"
                  key={fileNonce}
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  disabled={submitting}
                  className="w-full cursor-pointer border border-matrix/20 bg-black/70 px-3 py-2 font-mono text-[10px] text-ash/70 file:mr-3 file:cursor-pointer file:border file:border-matrix/40 file:bg-matrix/10 file:px-2.5 file:py-1 file:font-mono file:text-[9px] file:tracking-[0.2em] file:text-matrix file:uppercase hover:border-matrix/35 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {preview || editingImage ? (
                  <div className="mt-2 flex items-start gap-2">
                    <img
                      src={preview ?? editingImage ?? ''}
                      alt="selected product artwork"
                      className="h-20 w-32 border border-matrix/25 object-cover"
                    />
                    <TermButton
                      variant="ghost"
                      className="px-2 py-1 text-[8px]"
                      onClick={removeImage}
                      disabled={submitting}
                    >
                      {editingImage ? 'REMOVE_IMAGE' : 'CLEAR'}
                    </TermButton>
                  </div>
                ) : (
                  <p className="mt-1.5 font-mono text-[9px] leading-relaxed tracking-[0.18em] text-ash/35 uppercase">
                    stored in storage://card-images · public url saved in cards.image_url
                  </p>
                )}
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
                {editingId
                  ? `update cards where id = ${editingId.slice(0, 8)}…`
                  : 'insert → public.cards'}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {editingId ? (
                  <TermButton
                    variant="ghost"
                    className="px-4 py-2"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                    CANCEL_EDIT
                  </TermButton>
                ) : null}
                <TermButton type="submit" className="px-4 py-2" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      WRITING…
                    </>
                  ) : editingId ? (
                    <>
                      <Save className="h-3 w-3" aria-hidden="true" />
                      SAVE_CHANGES
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" aria-hidden="true" />
                      CREATE_PRODUCT
                    </>
                  )}
                </TermButton>
              </div>
            </div>
          </form>
        </Panel>
      </div>

      {loadError ? (
        <Panel accent="alert" label="catalog_unreachable" className="p-5">
          <p className="flex items-start gap-2 font-mono text-[11px] leading-relaxed tracking-[0.12em] text-[#ff849b] uppercase">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            cards_unreachable :: {loadError}
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

      <Panel label="product_catalog" className="p-0">
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
            EXISTING_PRODUCTS
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{counts.total} rows</span>
            <TermButton
              variant="ghost"
              className="px-3 py-1.5 text-[9px]"
              onClick={() => setNonce((value) => value + 1)}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              REFRESH
            </TermButton>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 border-t border-white/5 px-4 py-8 font-mono text-[11px] tracking-[0.25em] text-matrix/50 uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            querying cards…
          </div>
        ) : null}

        {!loading && !loadError && counts.total === 0 ? (
          <p className="border-t border-white/5 px-4 py-8 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
            catalog empty — create the first product above
          </p>
        ) : null}

        {!loading && counts.total > 0 ? (
          <div className="overflow-x-auto border-t border-white/5">
            <table className="table-term">
              <thead>
                <tr>
                  <th scope="col">image</th>
                  <th scope="col">name</th>
                  <th scope="col">type</th>
                  <th scope="col">price</th>
                  <th scope="col">stock_status</th>
                  <th scope="col" className="text-right">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((card) => (
                  <tr key={card.id}>
                    <td className="whitespace-nowrap">
                      {card.imageUrl ? (
                        <a
                          href={card.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="open full artwork"
                          className="inline-block cursor-pointer border border-matrix/25 transition-colors hover:border-matrix/60"
                        >
                          <img
                            src={card.imageUrl}
                            alt={`${card.name} artwork`}
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
                    <td className="max-w-[16rem]">
                      <p className="truncate font-mono text-[11px] text-bone/85" title={card.name}>
                        {card.name}
                      </p>
                      {card.tagline ? (
                        <p
                          className="truncate font-mono text-[9.5px] tracking-[0.1em] text-matrix/70"
                          title={`card balance ${card.tagline}`}
                        >
                          BALANCE: {formatBalance(card.tagline)}
                        </p>
                      ) : null}
                      <p className="font-mono text-[9px] tracking-[0.15em] text-matrix/30">
                        #{card.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-matrix/70">{card.brand}</td>
                    <td className="whitespace-nowrap text-bone/80">{usd(card.priceUsd)} USD</td>
                    <td className="whitespace-nowrap">
                      <span className={STOCK_STYLES[card.stockStatus]}>{card.stockStatus}</span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <TermButton
                          variant="ghost"
                          className="px-2.5 py-1 text-[9px]"
                          title="Load this product into the form"
                          onClick={() => startEdit(card)}
                          disabled={submitting || deleting}
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          EDIT
                        </TermButton>
                        <TermButton
                          variant="alert"
                          className="px-2.5 py-1 text-[9px]"
                          title="Permanently delete this product"
                          onClick={() => setConfirming(card)}
                          disabled={submitting || deleting}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          DELETE
                        </TermButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[9px] tracking-[0.18em] text-ash/40 uppercase">
            public.cards · admin-only writes · rls enforced
          </p>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ash/30 uppercase">
            {counts.inStock} in stock · {counts.lowStock} low · {counts.outOfStock} out
          </p>
        </div>
      </Panel>

      {confirming ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cancel delete"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!deleting) setConfirming(null)
            }}
            tabIndex={-1}
          />
          <Panel accent="alert" label="confirm_delete" className="relative w-full max-w-md p-5">
            <p className="flex items-start gap-2 font-mono text-[10.5px] leading-relaxed tracking-[0.15em] text-[#ff849b] uppercase">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              delete product {confirming.name} permanently?
            </p>
            <p className="mt-3 border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-ash/60 uppercase">
              {confirming.brand} · {usd(confirming.priceUsd)} USD · {confirming.stockStatus}
            </p>
            <p className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.18em] text-ash/35 uppercase">
              the row is removed from public.cards · attached card_units cascade · this cannot be
              undone
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <TermButton
                variant="alert"
                className="flex-1 py-2"
                onClick={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    DELETING…
                  </>
                ) : (
                  'CONFIRM_DELETE'
                )}
              </TermButton>
              <TermButton
                variant="ghost"
                className="py-2 sm:w-32"
                onClick={() => setConfirming(null)}
                disabled={deleting}
              >
                CANCEL
              </TermButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
