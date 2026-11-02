import { supabase } from './supabase'
import type {
  AdminUser,
  Card,
  CardDraft,
  CardUnit,
  DeliveryDetails,
  NewOrder,
  Order,
  OrderStatus,
  StockStatus,
} from '../types/db'

type Row = Record<string, unknown>

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalisePerks(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,|]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normaliseStock(value: unknown): StockStatus {
  const status = str(value, 'in_stock').toLowerCase().replace(/[\s-]+/g, '_')
  if (status === 'out_of_stock' || status === 'sold_out' || status === '0') return 'out_of_stock'
  if (status === 'low_stock' || status === 'low' || status === 'limited') return 'low_stock'
  return 'in_stock'
}

/** Tolerates small schema variations while keeping one typed UI model. */
export function mapCard(row: Row): Card {
  return {
    id: String(row.id ?? ''),
    name: str(
      row.card_name ?? row.name ?? row.title ?? row.tier,
      'UNNAMED_CARD',
    ).toUpperCase(),
    tagline: str(row.description ?? row.card_description ?? row.tagline ?? row.subtitle),
    brand: str(
      row.brand ?? row.card_brand ?? row.network ?? row.card_network,
      'VISA',
    ).toUpperCase(),
    priceUsd: num(row.price_in_usd ?? row.price_usd ?? row.price ?? row.amount_usd),
    stockStatus: normaliseStock(row.stock_status ?? row.stock ?? row.inventory_status),
    loadLimit:
      row.load_limit !== undefined && row.load_limit !== null
        ? str(row.load_limit)
        : null,
    monthlyLimit:
      row.monthly_limit !== undefined && row.monthly_limit !== null
        ? str(row.monthly_limit)
        : null,
    perks: normalisePerks(row.perks ?? row.features),
    imageUrl: str(row.image_url ?? row.imageUrl ?? row.image ?? row.card_image) || null,
    raw: row,
  }
}

function normaliseStatus(value: unknown): OrderStatus {
  const status = str(value, 'pending').toLowerCase()
  if (status === 'completed' || status === 'approved' || status === 'paid') return 'completed'
  if (status === 'failed' || status === 'rejected') return 'failed'
  return 'pending'
}

function normaliseDelivery(value: unknown): DeliveryDetails {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as Record<string, unknown>
      } catch {
        return trimmed
      }
    }
    return trimmed
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return null
}

export function mapOrder(row: Row): Order {
  const nestedCard = row.cards as Row | undefined
  return {
    id: String(row.id ?? ''),
    userId: str(row.user_id),
    cardId: str(row.card_id),
    cardName: nestedCard
      ? str(nestedCard.card_name ?? nestedCard.name) || null
      : str(row.card_name ?? row.card_title) || null,
    amountUsd: num(
      row.amount_usd ?? row.price_in_usd ?? row.amount ?? row.price_usd,
    ),
    cryptoMethod: str(row.crypto_method ?? row.payment_method) || null,
    txid: str(row.txid ?? row.tx_hash) || null,
    status: normaliseStatus(row.status),
    deliveryDetails: normaliseDelivery(row.delivery_details),
    createdAt: str(row.created_at ?? row.inserted_at) || null,
    raw: row,
  }
}

/** Role lookup: `user_roles` is the single source of truth for admin access. */
export async function fetchUserRole(userId: string): Promise<'admin' | 'user'> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (error) {
    console.warn('[vCARD] user_roles lookup failed:', error.message)
    return 'user'
  }

  const roles = (data ?? []) as Row[]
  return roles.some((row) => str(row.role).toLowerCase() === 'admin') ? 'admin' : 'user'
}

export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase.from('cards').select('*')
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapCard).sort((a, b) => a.priceUsd - b.priceUsd)
}

/* -------------------------------------------------------------------------- */
/* cards: PRODUCT_MANAGEMENT writes (admin only, RLS enforced)                 */
/* -------------------------------------------------------------------------- */

/**
 * Canonical `cards` payload plus a legacy alias payload. Older projects expose
 * `card_name` / `price_in_usd`, so a rejected write is retried with those names
 * before the original error is surfaced to the console.
 */
function cardPayloads(draft: CardDraft): [Row, Row] {
  const shared: Row = {
    description: draft.description.trim() || null,
    brand: draft.brand.trim().toUpperCase() || 'VISA',
    stock_status: draft.stockStatus,
    image_url: draft.imageUrl,
  }
  return [
    { ...shared, name: draft.name.trim(), price_usd: draft.priceUsd },
    { ...shared, card_name: draft.name.trim(), price_in_usd: draft.priceUsd },
  ]
}

function assertDraft(draft: CardDraft): void {
  if (!draft.name.trim()) throw new Error('name_required')
  if (!Number.isFinite(draft.priceUsd) || draft.priceUsd < 0) {
    throw new Error('price_invalid')
  }
}

/** Inserts one new product into `cards`. */
export async function createCard(draft: CardDraft): Promise<void> {
  assertDraft(draft)
  const [canonical, legacy] = cardPayloads(draft)
  const first = await supabase.from('cards').insert(canonical)
  if (!first.error) return

  const retry = await supabase.from('cards').insert(legacy)
  if (retry.error) throw first.error
}

/** Updates one product; the image can be replaced or cleared (`imageUrl: null`). */
export async function updateCard(cardId: string, draft: CardDraft): Promise<void> {
  if (!cardId) throw new Error('card_required')
  assertDraft(draft)
  const [canonical, legacy] = cardPayloads(draft)
  const first = await supabase.from('cards').update(canonical).eq('id', cardId)
  if (!first.error) return

  const retry = await supabase.from('cards').update(legacy).eq('id', cardId)
  if (retry.error) throw first.error
}

/** Admin hard-delete: removes the product row (its units cascade). */
export async function deleteCard(cardId: string): Promise<void> {
  if (!cardId) throw new Error('card_required')
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) throw error
}

/**
 * Orders for one operator (dashboard) or every order (admin).
 * `orders` only stores `card_id`, so the matching `cards.name` is joined
 * client-side (no FK embed required) and written back into `order.cardName`.
 */
export async function fetchOrders(userId?: string): Promise<Order[]> {
  let query = supabase.from('orders').select('*')
  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) throw error

  const orders = ((data ?? []) as Row[]).map(mapOrder)
  const missingNames = orders.some((order) => !order.cardName)

  if (missingNames) {
    const names = await fetchCardNames()
    for (const order of orders) {
      if (!order.cardName) order.cardName = names.get(order.cardId) ?? null
    }
  }

  return orders.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

/**
 * `orders` only stores `card_id`; this rebuilds the id → name map used by the
 * dashboard/admin order logs. Older projects expose `card_name` instead of
 * `name`, so each known shape is tried before a `select('*')` fallback.
 */
async function fetchCardNames(): Promise<Map<string, string>> {
  const map = new Map<string, string>()

  const shapes = [
    () => supabase.from('cards').select('id, name'),
    () => supabase.from('cards').select('id, card_name'),
    () => supabase.from('cards').select('*'),
  ]

  for (const shape of shapes) {
    const { data, error } = (await shape()) as {
      data: Row[] | null
      error: { message: string } | null
    }
    if (error) continue

    const rows = data ?? []
    for (const row of rows) {
      const id = str(row.id)
      const name = str(row.card_name ?? row.name ?? row.title ?? row.tier)
      if (id && name) map.set(id, name.toUpperCase())
    }

    // Rows exist but carried no usable name → try the next column shape.
    if (map.size > 0 || rows.length === 0) return map
  }

  return map
}

export async function createOrder(order: NewOrder): Promise<void> {
  const { error } = await supabase.from('orders').insert(order)
  if (error) throw error
}

/** Admin approval goes through the SECURITY DEFINER RPC, never a raw update. */
export async function resolvePayment(orderId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('resolve_payment', {
    p_order_id: orderId,
    p_approve: approve,
  })
  if (error) throw error
}

/** Admin hard-delete: the row is removed, no audit trail left in `orders`. */
export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  if (error) throw error
}

/* -------------------------------------------------------------------------- */
/* users: USER_MANAGEMENT (admin only, RPC + user_roles writes)                */
/* -------------------------------------------------------------------------- */

function toBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase()
    if (['true', 't', '1', 'yes', 'admin'].includes(normalised)) return true
    if (['false', 'f', '0', 'no', 'user'].includes(normalised)) return false
  }
  return null
}

/**
 * Tolerates both the canonical RPC shape (`is_admin`) and projects that expose
 * a plain `role` column (or a `user_id` / `email_address` alias).
 */
export function mapAdminUser(row: Row): AdminUser {
  const flag = toBool(row.is_admin ?? row.isAdmin ?? row.admin)
  const role = str(row.role).toLowerCase()

  return {
    id: str(row.id ?? row.user_id ?? row.uid),
    email: str(row.email ?? row.user_email ?? row.email_address) || null,
    isAdmin: flag ?? role === 'admin',
    createdAt: str(row.created_at ?? row.joined_at ?? row.inserted_at ?? row.createdAt) || null,
    raw: row,
  }
}

/**
 * `admin_get_users()` returns id, email, is_admin and created_at for every auth
 * user. The function is SECURITY DEFINER so the anon-key client never needs
 * read access on `auth.users`.
 */
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_get_users')
  if (error) throw error

  const rows = Array.isArray(data)
    ? (data as Row[])
    : data && typeof data === 'object'
      ? [data as Row]
      : []

  return rows
    .map(mapAdminUser)
    .filter((user) => user.id)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

/**
 * Grant admin: inserts the `admin` row into `user_roles`. Projects where
 * `user_id` is the primary key (one row per operator) reject the insert, so the
 * existing row is upgraded instead.
 */
export async function grantAdminRole(userId: string): Promise<void> {
  if (!userId) throw new Error('user_required')

  const insert = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' })
  if (!insert.error) return

  const update = await supabase
    .from('user_roles')
    .update({ role: 'admin' })
    .eq('user_id', userId)

  if (update.error) throw insert.error
}

/**
 * Revoke admin: deletes the `admin` row from `user_roles` and leaves the
 * `user` row untouched. If the project keeps a single role row per operator,
 * that row is downgraded to `user` instead of being deleted so the account
 * never ends up role-less.
 */
export async function revokeAdminRole(userId: string): Promise<void> {
  if (!userId) throw new Error('user_required')

  const removed = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'admin')
    .select('user_id')

  if (removed.error) throw removed.error

  const remaining = await supabase.from('user_roles').select('role').eq('user_id', userId)
  if (remaining.error) throw remaining.error

  if (((remaining.data ?? []) as Row[]).length === 0) {
    const downgrade = await supabase.from('user_roles').insert({ user_id: userId, role: 'user' })
    if (downgrade.error) throw downgrade.error
  }
}

/* -------------------------------------------------------------------------- */
/* inventory: card_units + storage                                             */
/* -------------------------------------------------------------------------- */

/** Public bucket that stores the card screenshots pasted in INVENTORY_MANAGEMENT. */
export const CARD_IMAGE_BUCKET = 'card-images'

const DETAIL_TEXT_KEYS = [
  'details',
  'text',
  'card_details',
  'detail',
  'value',
  'note',
  'content',
]

const DETAIL_IMAGE_KEYS = [
  'image_url',
  'image',
  'imageUrl',
  'card_image',
  'screenshot_url',
  'preview_url',
]

function pickString(row: Row, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return null
}

/** Plain-text card material of a delivery payload (object, JSON string or text). */
export function deliveryText(details: DeliveryDetails): string | null {
  if (!details) return null
  if (typeof details === 'string') return details
  return pickString(details as Row, DETAIL_TEXT_KEYS)
}

/** Uploaded screenshot URL attached to a delivery payload, when present. */
export function deliveryImageUrl(details: DeliveryDetails): string | null {
  if (!details || typeof details !== 'object') return null
  const candidate = pickString(details as Row, DETAIL_IMAGE_KEYS)
  return candidate && /^https?:\/\//i.test(candidate) ? candidate : null
}

function normaliseSold(row: Row): boolean {
  const flag = row.is_sold ?? row.sold ?? row.used
  if (flag === true || flag === 1) return true
  const text = str(flag).toLowerCase()
  if (text === 'true' || text === 't' || text === '1' || text === 'yes') return true

  if (row.sold_at || row.used_at || row.redeemed_at) return true
  if (row.order_id || row.sold_order_id) return true

  const status = str(row.status ?? row.state).toLowerCase()
  return status === 'sold' || status === 'used' || status === 'delivered'
}

export function mapCardUnit(row: Row): CardUnit {
  const delivery = normaliseDelivery(
    row.delivery_details ?? row.details ?? row.card_details ?? row.payload,
  )
  return {
    id: String(row.id ?? ''),
    cardId: str(row.card_id ?? row.product_id ?? row.card ?? row.cards_id),
    deliveryDetails: delivery,
    details: deliveryText(delivery) ?? str(row.details ?? row.card_details),
    imageUrl:
      deliveryImageUrl(delivery) ??
      pickString(row, DETAIL_IMAGE_KEYS) ??
      null,
    sold: normaliseSold(row),
    orderId: str(row.order_id ?? row.sold_order_id) || null,
    createdAt: str(row.created_at ?? row.inserted_at) || null,
    raw: row,
  }
}

/** Every unit for one card product; sold ones are filtered in the UI. */
export async function fetchCardUnits(cardId: string): Promise<CardUnit[]> {
  const { data, error } = await supabase
    .from('card_units')
    .select('*')
    .eq('card_id', cardId)

  if (error) throw error
  return ((data ?? []) as Row[])
    .map(mapCardUnit)
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

/** Uploads a card screenshot and returns its public URL. */
export async function uploadCardImage(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  const path = `${Date.now()}-${suffix}.${extension}`

  const { error } = await supabase.storage
    .from(CARD_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png',
    })
  if (error) throw error

  const { data } = supabase.storage.from(CARD_IMAGE_BUCKET).getPublicUrl(path)
  const publicUrl = data?.publicUrl
  if (!publicUrl) throw new Error('public_url_unavailable')
  return publicUrl
}

/**
 * Inserts one `card_units` row per pasted line. `delivery_details` keeps the
 * pasted material plus the uploaded screenshot URL; if the column is plain
 * `text` instead of `jsonb` the insert is retried with a JSON string.
 */
export async function createCardUnits(
  cardId: string,
  lines: string[],
  imageUrl: string | null,
): Promise<number> {
  const clean = lines.map((line) => line.trim()).filter(Boolean)
  if (!cardId) throw new Error('card_required')
  if (clean.length === 0) throw new Error('details_required')

  const asObject = clean.map((line) => ({
    card_id: cardId,
    delivery_details: { details: line, text: line, image_url: imageUrl },
  }))
  const asString = clean.map((line) => ({
    card_id: cardId,
    delivery_details: JSON.stringify({
      details: line,
      text: line,
      image_url: imageUrl,
    }),
  }))

  const first = await supabase.from('card_units').insert(asObject)
  if (!first.error) return clean.length

  const retry = await supabase.from('card_units').insert(asString)
  if (retry.error) throw first.error
  return clean.length
}

export async function deleteCardUnit(unitId: string): Promise<void> {
  const { error } = await supabase.from('card_units').delete().eq('id', unitId)
  if (error) throw error
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'unknown_failure'
}
