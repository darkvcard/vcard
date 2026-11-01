import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Radio, Terminal } from 'lucide-react'
import { Navbar } from './Navbar'

type LayoutProps = {
  children: ReactNode
}

const footerCols = [
  {
    title: 'protocol',
    items: ['how it works', 'card tiers', 'crypto rates', 'faq'],
  },
  {
    title: 'shadow ops',
    items: ['privacy', 'no-logs policy', 'warranty', 'support'],
  },
]

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[80] focus:border focus:border-matrix focus:bg-void focus:px-3 focus:py-2 focus:text-xs focus:text-matrix"
      >
        skip to content
      </a>

      <Navbar />

      <main id="main" className="relative flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="relative mt-auto border-t border-matrix/15 bg-black/60">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
          <div>
            <Link to="/" className="flex items-baseline gap-0.5 font-mono text-lg font-extrabold tracking-tighter">
              <span className="text-neon/80">{'{'}</span>
              <span className="text-matrix text-glow">vCARD</span>
              <span className="text-neon/80">{'}'}</span>
            </Link>
            <p className="mt-4 max-w-xs font-mono text-[11px] leading-relaxed text-ash/60">
              Virtual debit cards issued in the dark. No KYC, no logs, no paper trail -
              only an encrypted session and a card number that ends where you do.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">
                <Lock className="h-3 w-3" aria-hidden="true" />
                e2e encrypted
              </span>
              <span className="chip chip-neon">
                <Radio className="h-3 w-3" aria-hidden="true" />
                onion ready
              </span>
            </div>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <h3 className="hud">// {col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item}>
                    <span className="cursor-not-allowed font-mono text-[11px] tracking-wider text-ash/50 transition-colors hover:text-matrix/70">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="hud">// system_status</h3>
            <div className="mt-4 space-y-3 font-mono text-[10px] tracking-[0.2em] text-ash/60 uppercase">
              {[
                ['clearnet node', 'online', 'text-matrix'],
                ['payment gateway', 'online', 'text-matrix'],
                ['card issuer', 'degraded', 'text-alert'],
              ].map(([label, state, color]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                  <span>{label}</span>
                  <span className={`flex items-center gap-1.5 ${color}`}>
                    <span className="h-1 w-1 animate-blink rounded-full bg-current" />
                    {state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 font-mono text-[9px] tracking-[0.28em] text-ash/35 uppercase sm:flex-row sm:px-6 lg:px-8">
            <span className="flex items-center gap-2">
              <Terminal className="h-3 w-3" aria-hidden="true" />
              {'{vCARD}'} // no_logs_no_trace
            </span>
            <span>build 0.1.0-alpha · ui shell · demo data only</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
