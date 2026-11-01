import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Activity,
  ArrowUpRight,
  Copy,
  Download,
  Snowflake,
  Wallet,
} from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton, TermLink } from '../components/TermButton'
import { VirtualCard } from '../components/VirtualCard'
import { useAuth } from '../hooks/useAuth'

const DEPOSIT_ADDRESS = 'bc1q7f4a9x2ghost0vcard8zz4m2kq9n3v7t'

const transactions = [
  { id: 'tx_9012', merchant: 'nordvpn.com', at: '12m ago', amount: '-4.99', state: 'settled' },
  { id: 'tx_9011', merchant: 'openai.com', at: '3h ago', amount: '-20.00', state: 'settled' },
  { id: 'tx_9010', merchant: 'steam wallet', at: '1d ago', amount: '-50.00', state: 'settled' },
  { id: 'tx_9009', merchant: 'deposit · usdt', at: '1d ago', amount: '+250.00', state: 'confirmed' },
  { id: 'tx_9008', merchant: 'aws.amazon.com', at: '2d ago', amount: '-12.40', state: 'declined' },
]

const quickActions = [
  { icon: Copy, label: 'copy_pan', note: 'pan•••• 4021' },
  { icon: Snowflake, label: 'freeze', note: 'instant lock' },
  { icon: Wallet, label: 'reload', note: 'crypto only' },
  { icon: Download, label: 'export', note: 'csv statement' },
]

const stateStyles: Record<string, string> = {
  settled: 'text-matrix/80 border-matrix/30',
  confirmed: 'text-[#d9aaff] border-neon/40',
  declined: 'text-[#ff849b] border-alert/40',
}

export function Dashboard() {
  const { user } = useAuth()
  const [status, setStatus] = useState('session active · card online')

  return (
    <div className="animate-rise">
      <header className="flex flex-col gap-4 border-b border-matrix/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hud">// operator_console</p>
          <GlitchText
            as="h1"
            text="DASHBOARD"
            className="mt-3 font-mono text-3xl font-extrabold tracking-tighter sm:text-4xl"
          />
          <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
            operator :: {user?.email ?? 'anonymous_guest'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-matrix" />
            {status}
          </span>
          <TermLink to="/shop" prompt="&gt;" variant="neon" className="px-4 py-2">
            MINT_NEW
          </TermLink>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* card + quick actions */}
        <div className="space-y-6">
          <VirtualCard
            holder={user?.email?.split('@')[0]?.toUpperCase() ?? 'ANON_OPERATOR'}
            balance="$250.00"
            className="shadow-[0_24px_70px_-30px_rgba(157,0,255,0.55)]"
          />

          <Panel label="quick_actions" className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <TermButton
                    key={action.label}
                    variant="ghost"
                    className="h-full flex-col gap-2 px-2 py-3 text-[9px] tracking-[0.18em]"
                    onClick={() => setStatus(`${action.label} :: executed`)}
                  >
                    <Icon className="h-4 w-4 text-matrix/70" aria-hidden="true" />
                    {action.label}
                    <span className="text-[8px] font-normal tracking-[0.15em] text-ash/40">
                      {action.note}
                    </span>
                  </TermButton>
                )
              })}
            </div>
          </Panel>

          <Panel label="transactions">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
                LEDGER_LAST_5
              </h2>
              <span className="hud">no entries purged</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table-term">
                <thead>
                  <tr>
                    <th scope="col">id</th>
                    <th scope="col">merchant</th>
                    <th scope="col">when</th>
                    <th scope="col" className="text-right">amount</th>
                    <th scope="col" className="text-right">state</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-matrix/40">{tx.id}</td>
                      <td>{tx.merchant}</td>
                      <td className="text-ash/50">{tx.at}</td>
                      <td
                        className={`text-right ${
                          tx.amount.startsWith('+') ? 'text-matrix' : 'text-bone/80'
                        }`}
                      >
                        {tx.amount}
                      </td>
                      <td className="text-right">
                        <span
                          className={`inline-block border px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase ${stateStyles[tx.state]}`}
                        >
                          {tx.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* balance + deposit */}
        <div className="space-y-6">
          <Panel label="balance" className="relative p-5">
            <div className="scan-sweep" aria-hidden="true" />
            <p className="hud">available_usdt</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-matrix text-glow">
              250.00
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-matrix/50 uppercase">
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              +250.00 loaded 1d ago
            </p>

            <svg
              viewBox="0 0 220 60"
              className="mt-5 h-16 w-full text-matrix/70"
              role="img"
              aria-label="Balance trend, trending up"
            >
              <polyline
                points="0,50 25,44 50,46 75,34 100,38 125,22 150,26 175,14 200,18 220,8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <polyline
                points="0,50 25,44 50,46 75,34 100,38 125,22 150,26 175,14 200,18 220,8 220,60 0,60"
                fill="url(#fade)"
                stroke="none"
              />
              <defs>
                <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff41" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00ff41" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 font-mono text-[10px] tracking-[0.15em] uppercase">
              <div>
                <p className="hud text-[8px]">spent_30d</p>
                <p className="mt-1 text-bone/75">87.39</p>
              </div>
              <div>
                <p className="hud text-[8px]">limit_left</p>
                <p className="mt-1 text-bone/75">2,412.61</p>
              </div>
            </div>
            <div className="mt-3 h-1 w-full bg-white/5">
              <div className="h-1 w-[18%] bg-matrix shadow-[0_0_10px_#00ff41]" />
            </div>
          </Panel>

          <Panel accent="neon" label="deposit_address" className="p-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="border border-matrix/25 bg-black p-2">
                <QRCodeSVG
                  value={`bitcoin:${DEPOSIT_ADDRESS}`}
                  size={112}
                  bgColor="#050505"
                  fgColor="#00ff41"
                  level="M"
                  title="BTC deposit QR code"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="hud">network :: bitcoin</p>
                <p className="mt-2 font-mono text-[10.5px] leading-relaxed break-all text-bone/75">
                  {DEPOSIT_ADDRESS}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TermButton
                    variant="ghost"
                    className="px-3 py-1.5 text-[9px]"
                    onClick={() => setStatus('deposit address copied')}
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    COPY
                  </TermButton>
                  <span className="chip chip-neon">1 conf</span>
                </div>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-ash/40 uppercase">
              <Activity className="h-3 w-3" aria-hidden="true" />
              address rotates every 24h
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
