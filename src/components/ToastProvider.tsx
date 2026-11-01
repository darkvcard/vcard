import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { ToastContext } from '../context/toast-context'
import type { ToastItem, ToastVariant } from '../context/toast-context'

const styles: Record<ToastVariant, { box: string; icon: string }> = {
  success: {
    box: 'border-matrix/50 bg-void-2/95 shadow-[0_0_36px_-14px_#00ff41]',
    icon: 'text-matrix',
  },
  error: {
    box: 'border-alert/60 bg-void-2/95 shadow-[0_0_36px_-14px_#ff003c]',
    icon: 'text-[#ff849b]',
  },
  info: {
    box: 'border-neon/50 bg-void-2/95 shadow-[0_0_36px_-14px_#9d00ff]',
    icon: 'text-[#d9aaff]',
  },
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const

const TTL_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-3), { id, message, variant }])
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
        timers.current.delete(id)
      }, TTL_MS)
      timers.current.set(id, timer)
    },
    [],
  )

  useEffect(() => {
    const active = timers.current
    return () => {
      active.forEach((timer) => clearTimeout(timer))
      active.clear()
    }
  }, [])

  const value = useMemo(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[95] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.variant]
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 border px-4 py-3 backdrop-blur-md ${styles[toast.variant].box}`}
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${styles[toast.variant].icon}`}
                aria-hidden="true"
              />
              <p className="flex-1 font-mono text-[11px] leading-relaxed tracking-[0.12em] text-bone/85 uppercase">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="cursor-pointer text-ash/50 transition-colors hover:text-matrix"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
