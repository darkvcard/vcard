import type { ReactNode } from 'react'

type GlitchTextProps = {
  /** Plain text - duplicated into the ::before / ::after glitch layers. */
  text: string
  className?: string
  id?: string
  as?: 'h1' | 'h2' | 'h3' | 'span'
}

/**
 * Chromatic-aberration glitch heading.
 * The CSS layers use `attr(data-text)` so the markup stays accessible
 * (screen readers only get the real text once).
 */
export function GlitchText({
  text,
  className = '',
  id,
  as: Tag = 'h2',
}: GlitchTextProps) {
  return (
    <Tag id={id} className={`glitch ${className}`} data-text={text}>
      {text}
    </Tag>
  )
}

type PanelProps = {
  children: ReactNode
  className?: string
  /** Optional HUD label rendered on the top edge of the frame. */
  label?: string
  accent?: 'matrix' | 'neon' | 'alert'
}

const accents = {
  matrix: '',
  neon: 'panel-neon',
  alert: 'panel-alert',
} as const

const labelColors = {
  matrix: 'text-matrix/60 border-matrix/25',
  neon: 'text-[#d9aaff] border-neon/40',
  alert: 'text-[#ff849b] border-alert/40',
} as const

export function Panel({
  children,
  className = '',
  label,
  accent = 'matrix',
}: PanelProps) {
  return (
    <div className={`panel ${accents[accent]} ${className}`}>
      {label ? (
        <span
          className={`absolute -top-2.5 left-4 border bg-void px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.32em] ${labelColors[accent]}`}
        >
          {label}
        </span>
      ) : null}
      {children}
    </div>
  )
}
