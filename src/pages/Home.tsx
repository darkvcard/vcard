import {
  Activity,
  ArrowRight,
  Bitcoin,
  EyeOff,
  Globe,
  Layers,
  ShieldCheck,
  Skull,
  Terminal,
  Zap,
} from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermLink } from '../components/TermButton'
import { VirtualCard } from '../components/VirtualCard'

const bootLog = [
  { text: '$ ./vcard --connect --anon', tone: 'text-matrix' },
  { text: '[ok] tunnel established :: tor 3 hops', tone: 'text-matrix/60' },
  { text: '[ok] keystore unlocked (aes-256-gcm)', tone: 'text-matrix/60' },
  { text: '[ok] issuer handshake :: 41ms', tone: 'text-matrix/60' },
  { text: '> mint card --tier GHOST --fund 250 USDT', tone: 'text-neon/80' },
  { text: '  card ready :: •••• 4021', tone: 'text-bone/70' },
]

const stats = [
  { label: 'cards_issued', value: '128,402', note: '+14.2% / 24h' },
  { label: 'median_mint', value: '38s', note: 'wallet -> swipe' },
  { label: 'jurisdictions', value: '190+', note: 'merchant accepted' },
  { label: 'kyc_records', value: '0', note: 'by design', accent: true },
]

const features = [
  {
    icon: Zap,
    title: 'instant mint',
    body: 'Card credentials are generated the moment your deposit confirms. No review queue, no human in the loop.',
  },
  {
    icon: EyeOff,
    title: 'zero kyc',
    body: 'No passport, no selfie, no address. An email alias and a funded wallet is the entire onboarding surface.',
  },
  {
    icon: Bitcoin,
    title: 'crypto settled',
    body: 'Fund with BTC, ETH, USDT, XMR or LTC. Balances convert at the live rate and settle into fiat rails.',
  },
  {
    icon: ShieldCheck,
    title: 'burn on demand',
    body: 'Kill a card mid-transaction. Number rotation is instant and the old PAN dies the moment you blink.',
  },
  {
    icon: Globe,
    title: 'merchant ready',
    body: 'Visa and Mastercard rails with 3-D Secure support for subscriptions, ads and cross-border checkout.',
  },
  {
    icon: Skull,
    title: 'no paper trail',
    body: 'Sessions are ephemeral and logs are purged hourly. What you spend never links back to who you are.',
    accent: true,
  },
]

const steps = [
  {
    id: '01',
    title: 'fund_wallet',
    body: 'Generate a deposit address, send crypto, wait for one confirmation.',
  },
  {
    id: '02',
    title: 'mint_card',
    body: 'Pick a tier and a spend limit. Credentials drop into your dashboard.',
    accent: true,
  },
  {
    id: '03',
    title: 'spend_anywhere',
    body: 'Paste the number at checkout or scan the virtual card into a wallet.',
  },
]

const ticker = ['btc', 'eth', 'usdt', 'xmr', 'ltc', 'sol', 'usdc']

export function Home() {
  return (
    <div className="animate-rise">
      {/* ============================ HERO ============================ */}
      <section className="relative -mx-4 -mt-10 overflow-hidden px-4 pt-14 pb-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[42rem] max-w-full -translate-x-1/2 rounded-full bg-matrix/10 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-neon/10 blur-[110px]"
          aria-hidden="true"
        />

        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-matrix" />
                node live // 0x7f4a
              </span>
              <span className="chip chip-neon">no kyc</span>
              <span className="chip chip-alert">burner ready</span>
            </div>

            <h1 className="mt-7 font-mono text-[2.7rem] leading-[0.92] font-extrabold tracking-tighter sm:text-6xl lg:text-[4.6rem]">
              <GlitchText as="span" text="UNTRACEABLE" className="block" />
              <span className="mt-2 block text-bone/90">
                VIRTUAL <span className="text-neon text-glow-neon">CARDS</span>
              </span>
            </h1>

            <p className="mt-6 max-w-xl font-mono text-sm leading-relaxed text-ash/80 sm:text-base">
              Disposable debit cards, minted in the dark and accepted in the light.
              Fund with crypto, spend anywhere Visa is accepted, and leave nothing
              behind but a number that already expired.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <TermLink to="/shop" prompt="&gt;" className="px-7 py-3.5">
                BUY_NOW
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TermLink>
              <TermLink to="/auth" variant="neon" className="px-7 py-3.5">
                [ CREATE_IDENTITY ]
              </TermLink>
            </div>

            <div className="mt-8 flex items-center gap-2 font-mono text-[11px] text-matrix/50">
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">$ deploy_card --tier ghost --pay btc</span>
              <span className="animate-blink text-matrix">▊</span>
            </div>
          </div>

          {/* terminal + card preview */}
          <div className="relative mx-auto w-full max-w-md lg:mx-0">
            <Panel label="secure_shell" className="relative">
              <div className="scan-sweep" aria-hidden="true" />
              <div className="flex items-center gap-2 border-b border-matrix/15 px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-alert/70" />
                <span className="h-2 w-2 rounded-full bg-matrix/40" />
                <span className="h-2 w-2 rounded-full bg-neon/50" />
                <span className="ml-auto hud">root@vcard:~/issuer</span>
              </div>
              <div className="space-y-1.5 p-4 font-mono text-[11px] leading-relaxed">
                {bootLog.map((line) => (
                  <p key={line.text} className={line.tone}>
                    {line.text}
                  </p>
                ))}
                <p className="pt-1 text-matrix">
                  <span className="animate-blink">▊</span>
                </p>
              </div>
            </Panel>

            <div className="relative z-10 -mt-6 ml-auto w-[88%] animate-float">
              <VirtualCard balance="250.00" className="shadow-[0_24px_60px_-24px_rgba(0,255,65,0.35)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ============================ TOKEN TICKER ============================ */}
      <div className="-mx-4 border-y border-matrix/15 bg-black/50 py-3 sm:-mx-6 lg:-mx-8">
        <div className="flex overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-10 pr-10">
            {[...ticker, ...ticker, ...ticker, ...ticker].map((token, index) => (
              <span
                key={`${token}-${index}`}
                className="flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-[0.35em] text-matrix/50 whitespace-nowrap uppercase"
              >
                <Bitcoin className="h-3.5 w-3.5 text-matrix/60" aria-hidden="true" />
                {token} accepted
                <span className="text-neon/40">//</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============================ STATS ============================ */}
      <section className="py-14" aria-label="Platform metrics">
        <div className="grid gap-px border border-matrix/15 bg-matrix/10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="group bg-void px-5 py-6 transition-colors hover:bg-matrix/[0.04]">
              <p className="hud">// {stat.label}</p>
              <p
                className={`mt-3 font-mono text-3xl font-bold tracking-tight ${
                  stat.accent ? 'text-neon text-glow-neon' : 'text-matrix text-glow'
                }`}
              >
                {stat.value}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.25em] text-ash/50 uppercase">
                {stat.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section className="py-10" aria-labelledby="capabilities">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="hud">// capabilities</p>
            <GlitchText as="h2" id="capabilities" text="BUILT FOR GHOSTS" className="mt-3 text-3xl font-extrabold tracking-tighter sm:text-4xl" />
          </div>
          <p className="max-w-sm font-mono text-[11px] leading-relaxed text-ash/60">
            Six primitives. No dashboard theatre, no compliance theatre. Just the
            machinery required to move money without a name attached to it.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Panel
                key={feature.title}
                accent={feature.accent ? 'neon' : 'matrix'}
                className="group relative p-6 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center border ${
                      feature.accent
                        ? 'border-neon/40 bg-neon/10 text-[#d9aaff]'
                        : 'border-matrix/30 bg-matrix/5 text-matrix'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.3em] text-matrix/25">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-mono text-sm font-bold tracking-[0.18em] uppercase">
                  {feature.title}
                </h3>
                <p className="mt-2.5 font-mono text-[11.5px] leading-relaxed text-ash/65">
                  {feature.body}
                </p>
              </Panel>
            )
          })}
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section className="relative overflow-hidden border border-matrix/15 bg-black/40 px-6 py-12 sm:px-10" aria-labelledby="protocol">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="hud">// protocol</p>
            <GlitchText as="h2" id="protocol" text="THREE COMMANDS" className="mt-3 text-2xl font-extrabold tracking-tighter sm:text-3xl" />
          </div>
          <span className="chip">
            <Activity className="h-3 w-3 animate-pulse" aria-hidden="true" />
            avg. total time 4m 12s
          </span>
        </div>

        <ol className="relative mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.id} className="relative border-l border-matrix/20 pl-5">
              <span
                className={`absolute -top-1 -left-[3px] h-1.5 w-1.5 ${
                  step.accent ? 'bg-neon shadow-[0_0_10px_#9d00ff]' : 'bg-matrix shadow-[0_0_10px_#00ff41]'
                }`}
              />
              <p className={`font-mono text-[10px] tracking-[0.4em] ${step.accent ? 'text-neon/70' : 'text-matrix/50'}`}>
                step_{step.id}
              </p>
              <h3 className="mt-2 font-mono text-sm font-bold tracking-[0.18em]">
                {step.title}
              </h3>
              <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-ash/65">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="mt-14" aria-labelledby="cta">
        <Panel label="final_call" className="relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" aria-hidden="true" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[34rem] max-w-full -translate-x-1/2 rounded-full bg-matrix/10 blur-[100px]" aria-hidden="true" />
          <div className="relative">
            <Layers className="mx-auto h-6 w-6 text-neon/70" aria-hidden="true" />
            <GlitchText as="h2" id="cta" text="READY TO VANISH?" className="mt-4 text-3xl font-extrabold tracking-tighter sm:text-5xl" />
            <p className="mx-auto mt-4 max-w-lg font-mono text-xs leading-relaxed text-ash/70">
              Mint your first card in under a minute. No identity, no interview,
              no trace - just a deposit address and a number that works everywhere.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <TermLink to="/shop" prompt="&gt;" className="px-8 py-3.5">
                [ EXECUTE ]
              </TermLink>
              <TermLink to="/dashboard" variant="ghost" className="px-8 py-3.5">
                VIEW_DASHBOARD
              </TermLink>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  )
}
