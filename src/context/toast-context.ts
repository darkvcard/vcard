import { createContext } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

export type ToastState = {
  toasts: ToastItem[]
  push: (message: string, variant?: ToastVariant) => void
  dismiss: (id: number) => void
}

export const ToastContext = createContext<ToastState | undefined>(undefined)
