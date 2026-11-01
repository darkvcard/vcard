import { supabase } from './supabase'
import type {
  Card,
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
  return status === 'out_of_stock' || status === 'sold_out' || status === '0'
    ? 'out_of_stock'
    : 'in_stock'
}

/** Tolerates small schema variations while keeping one typed UI model. */
export function mapCard(row: Row): Card {
  return {
    id: String(row.id ?? ''),
    name: str(row.name ?? row.title ?? row.tier, 'UNNAMED_CARD').toUpperCase(),
    tagline: str(row.description ?? row.tagline ?? row.subtitle),
    brand: str(row.brand ?? row.network ?? row.card_network, 'VISA').toUpperCase(),
    priceUsd: num(row.price_usd ?? row.price ?? row.amount_usd),
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
    cardName: nestedCard ? str(nestedCard.name) : str(row.card_name) || null,
    amountUsd: num(row.amount_usd ?? row.amount ?? row.price_usd),
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

/**
 * Orders for one operator (dashboard) or every order (admin).
 * Card names are joined client-side so no FK embed is required.
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

async function fetchCardNames(): Promise<Map<string, string>> {
  const { data } = await supabase.from('cards').select('id, name')
  const map = new Map<string, string>()
  for (const row of (data ?? []) as Row[]) {
    map.set(String(row.id ?? ''), str(row.name).toUpperCase())
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

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'unknown_failure'
}
