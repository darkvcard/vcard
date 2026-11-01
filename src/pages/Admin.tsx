import { AlertTriangle, Cpu, Database, ShieldCheck, Users } from 'lucide-react'
import { GlitchText, Panel } from '../components/GlitchText'
import { TermButton } from '../components/TermButton'

const metrics = [
  { icon: Database, label: 'gross_volume_24h', value: '48,912', unit: 'USDT', note: '+6.4%' },
  { icon: Users, label: 'active_operators', value: '3,204', unit: 'seats', note: '+128' },
  { icon: Cpu, label: 'cards_live', value: '11,876', unit: 'pans', note: 'issuer 41ms' },
  { icon: AlertTriangle, label: 'open_disputes', value: '7', unit: 'tickets', note: '-3', accent: true },
]

const orders = [
  { id: 'ord_8841', operator: 'ghost@proton.me', tier: 'NEON_10', amount: '59.00', state: 'awaiting_funds' },
  { id: 'ord_8840', operator: 'null@tuta.io', tier: 'VOID_25', amount: '129.00', state: 'minted' },
  { id: 'ord_8839', operator: '0x7f4a', tier: 'GHOST_05', amount: '34.00', state: 'minted' },
  { id: 'ord_8838', operator: 'anon@mail.i2p', tier: 'CIPHER_X', amount: '249.00', state: 'flagged' },
  { id: 'ord_8837', operator: 'shadow@cock.li', tier: 'ASH_00', amount: '0.00', state: 'minted' },
]

const orderStyles: Record<string, string> = {
  minted: 'text-matrix/80 border-matrix/30',
  awaiting_funds: 'text-[#d9aaff] border-neon/40',
  flagged: 'text-[#ff849b] border-alert/40',
}

const health = [
  { label: 'issuer_api', value: 98, tone: 'bg-matrix' },
  { label: 'payment_webhook', value: 91, tone: 'bg-matrix' },
  { label: 'kyc_vault', value: 0, tone: 'bg-neon' },
  { label: 'anomaly_engine', value: 64, tone: 'bg-alert' },
]

export function Admin() {
  return (
    <div className="animate-rise">
      {/* restricted banner */}
      <div className="flex flex-col gap-3 border border-alert/40 bg-alert/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] text-[#ff849b] uppercase">
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          restricted_area · access_level: root · all actions audited
        </p>
        <span className="chip chip-alert">clearance verified</span>
      </div>

      <header className="mt-8 flex flex-col gap-4 border-b border-matrix/15 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hud">// control_room</p>
          <GlitchText
            as="h1"
            text="ADMIN_CONSOLE"
            className="mt-3 font-mono text-3xl font-extrabold tracking-tighter sm:text-4xl"
          />
          <p className="mt-2 max-w-lg font-mono text-[11px] leading-relaxed text-ash/55">
            Issuer health, order queue and operator oversight. Everything here is
            mock data until the backend lands.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TermButton variant="ghost" className="px-4 py-2">
            EXPORT_LOGS
          </TermButton>
          <TermButton variant="alert" className="px-4 py-2">
            HALT_ISSUER
          </TermButton>
        </div>
      </header>

      {/* metrics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Panel key={metric.label} accent={metric.accent ? 'alert' : 'matrix'} className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-8 w-8 items-center justify-center border ${
                    metric.accent
                      ? 'border-alert/40 bg-alert/10 text-[#ff849b]'
                      : 'border-matrix/30 bg-matrix/5 text-matrix'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-mono text-[9px] tracking-[0.2em] text-matrix/40">
                  {metric.note}
                </span>
              </div>
              <p className="mt-4 hud text-[8px]">{metric.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-bone/90">
                {metric.value}
                <span className="ml-1.5 text-[9px] tracking-[0.2em] text-ash/40 uppercase">
                  {metric.unit}
                </span>
              </p>
            </Panel>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* order queue */}
        <Panel label="order_queue">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
              PENDING_ORDERS
            </h2>
            <span className="hud">live feed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-term">
              <thead>
                <tr>
                  <th scope="col">order</th>
                  <th scope="col">operator</th>
                  <th scope="col">tier</th>
                  <th scope="col" className="text-right">usdt</th>
                  <th scope="col" className="text-right">state</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="text-matrix/40">{order.id}</td>
                    <td className="text-bone/75">{order.operator}</td>
                    <td className="text-ash/60">{order.tier}</td>
                    <td className="text-right text-bone/80">{order.amount}</td>
                    <td className="text-right">
                      <span
                        className={`inline-block border px-2 py-0.5 text-[9px] tracking-[0.18em] uppercase ${orderStyles[order.state]}`}
                      >
                        {order.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* health */}
        <Panel label="issuer_health" accent="neon" className="p-5">
          <ul className="space-y-4">
            {health.map((item) => (
              <li key={item.label}>
                <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] uppercase">
                  <span className="text-ash/60">{item.label}</span>
                  <span className="text-bone/70">{item.value}%</span>
                </div>
                <div className="mt-1.5 h-1 w-full bg-white/5">
                  <div className={`h-1 ${item.tone}`} style={{ width: `${item.value}%` }} />
                </div>
              </li>
            ))}
          </ul>

          <div className="divider-term my-5" />

          <p className="flex items-center gap-2 font-mono text-[9.5px] leading-relaxed tracking-[0.15em] text-ash/45 uppercase">
            <ShieldCheck className="h-3.5 w-3.5 text-matrix/60" aria-hidden="true" />
            row level security enforced on every table
          </p>
        </Panel>
      </div>
    </div>
  )
}
