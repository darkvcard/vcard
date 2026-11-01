/** Static payment rails + the addresses that receive USDT. */
export type CryptoMethodId = 'USDT_BEP20' | 'USDT_SOLANA'

export type CryptoMethod = {
  id: CryptoMethodId
  /** Stored in `orders.crypto_method`. */
  label: string
  network: string
  address: string
  confirmations: number
}

export const CRYPTO_METHODS: CryptoMethod[] = [
  {
    id: 'USDT_BEP20',
    label: 'USDT - BEP20',
    network: 'BNB Smart Chain · BEP20',
    address: '0x35aec7E35F65ea227e49fDd321709D52Ada389E4',
    confirmations: 15,
  },
  {
    id: 'USDT_SOLANA',
    label: 'USDT - Solana',
    network: 'Solana · SPL',
    address: '3mjR2gV3MJrudjus9yBuh3EtSMw6Ca5BVFcYiMDa1VjQ',
    confirmations: 1,
  },
]

export function getCryptoMethod(id: CryptoMethodId): CryptoMethod {
  return CRYPTO_METHODS.find((method) => method.id === id) ?? CRYPTO_METHODS[0]
}
