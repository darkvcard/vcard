/** Shapes returned by Supabase (snake_case) + the normalised UI models. */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type Card = {
  id: string
  name: string
  tagline: string
  brand: string
  priceUsd: number
  stockStatus: StockStatus
  loadLimit: string | null
  monthlyLimit: string | null
  perks: string[]
  /** Public URL of the uploaded artwork (`cards.image_url`); null → CSS design. */
  imageUrl: string | null
  raw: Record<string, unknown>
}

/**
 * Writable fields of one `cards` row, used by PRODUCT_MANAGEMENT.
 * `imageUrl` is the public URL returned by the `card-images` storage bucket.
 */
export type CardDraft = {
  name: string
  brand: string
  priceUsd: number
  description: string
  stockStatus: StockStatus
  imageUrl: string | null
}

export type OrderStatus = 'pending' | 'completed' | 'failed'

export type DeliveryDetails = Record<string, unknown> | string | null

export type Order = {
  id: string
  userId: string
  cardId: string
  cardName: string | null
  amountUsd: number
  cryptoMethod: string | null
  txid: string | null
  status: OrderStatus
  deliveryDetails: DeliveryDetails
  createdAt: string | null
  raw: Record<string, unknown>
}

export type NewOrder = {
  user_id: string
  card_id: string
  amount_usd: number
  crypto_method: string
  txid: string
  status: 'pending'
}

/**
 * One purchasable unit of a card product (`card_units`).
 * `deliveryDetails` holds the real card material handed to the buyer and may
 * also carry the uploaded card screenshot (`image_url`).
 */
export type CardUnit = {
  id: string
  cardId: string
  deliveryDetails: DeliveryDetails
  /** Plain-text card material extracted from `delivery_details`. */
  details: string
  imageUrl: string | null
  sold: boolean
  orderId: string | null
  createdAt: string | null
  raw: Record<string, unknown>
}

