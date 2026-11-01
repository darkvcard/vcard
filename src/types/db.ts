/** Shapes returned by Supabase (snake_case) + the normalised UI models. */

export type StockStatus = 'in_stock' | 'out_of_stock'

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
  raw: Record<string, unknown>
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
