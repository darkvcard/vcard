import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'matrix' | 'neon' | 'alert' | 'ghost'

const variants: Record<Variant, string> = {
  matrix: '',
  neon: 'term-btn--neon',
  alert: 'term-btn--alert',
  ghost: 'term-btn--ghost',
}

type TermButtonProps = {
  children: ReactNode
  /** Terminal prompt prefix, e.g. "> " or "[ ". */
  prompt?: string
  variant?: Variant
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  fullWidth?: boolean
  /** Native tooltip, useful for icon-only actions. */
  title?: string
}

function classes(variant: Variant, fullWidth: boolean, className: string) {
  return ['term-btn', variants[variant], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ')
}

export function TermButton({
  children,
  prompt,
  variant = 'matrix',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  fullWidth = false,
  title,
}: TermButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={classes(variant, fullWidth, className)}
    >
      {prompt ? (
        <span className="term-btn__prompt" aria-hidden="true">
          {prompt}
        </span>
      ) : null}
      {children}
    </button>
  )
}

type TermLinkProps = {
  children: ReactNode
  to: string
  prompt?: string
  variant?: Variant
  className?: string
  fullWidth?: boolean
}

/** Same terminal styling, but router-aware. */
export function TermLink({
  children,
  to,
  prompt,
  variant = 'matrix',
  className = '',
  fullWidth = false,
}: TermLinkProps) {
  return (
    <Link to={to} className={classes(variant, fullWidth, className)}>
      {prompt ? (
        <span className="term-btn__prompt" aria-hidden="true">
          {prompt}
        </span>
      ) : null}
      {children}
    </Link>
  )
}

