# {vCARD} — darkweb virtual debit card store

An aggressive CRT / hacker-terminal storefront for a virtual debit card service,
built as a Vite + React + TypeScript shell. **Step 1** (scaffolding, Tailwind,
Supabase client) and **Step 2** (Darkweb theme, layout, placeholder pages) are
done: the UI runs, every route renders, and no business logic is wired yet.

## Stack

| Layer      | Choice                                            |
| ---------- | ------------------------------------------------- |
| Build      | Vite 8 + React 19 + TypeScript                    |
| Styling    | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first)  |
| Backend    | Supabase (`@supabase/supabase-js`)                |
| Routing    | `react-router-dom` v7                             |
| Icons      | `lucide-react`                                    |
| QR codes   | `qrcode.react`                                    |

## Getting started

```bash
npm install
cp .env.example .env      # already created with placeholders
npm run dev               # http://localhost:5173
```

Scripts: `npm run dev` · `npm run build` (tsc + vite) · `npm run preview` ·
`npm run lint` (oxlint).

### Environment

`.env` ships with placeholders so the shell boots offline:

```
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"
```

Replace both with the values from **Supabase → Project Settings → API**. The
anon key is safe in the browser; protect data with row level security.

`src/lib/supabase.ts` exports the singleton client plus `isSupabaseConfigured`,
and falls back to a dummy URL so `createClient` never throws during scaffolding.

## Tailwind v4 configuration

There is **no `tailwind.config.js`** — v4 is CSS-first. The whole theme lives in
`src/index.css` inside `@theme`, and Tailwind generates the utilities from it:

| Token / utility        | Value                                        |
| ---------------------- | -------------------------------------------- |
| `bg-void`              | `#050505` deep black                         |
| `text-matrix`          | `#00FF41` matrix green                       |
| `text-neon`            | `#9D00FF` neon purple                        |
| `text-alert`           | `#FF003C` alert red                          |
| `text-ash` / `text-bone` | muted grey-green / off-white body text     |
| `font-mono`            | JetBrains Mono → Fira Code → Courier New     |
| `animate-glitch-a/b`   | chromatic glitch layers                      |
| `animate-blink`        | terminal caret                               |
| `animate-scan`         | scan sweep                                   |
| `animate-marquee`      | crypto ticker                                |

The Vite plugin is registered in `vite.config.ts`:

```ts
plugins: [react(), tailwindcss()]
```

## Theme details

- **CRT scanlines** — `body::before` paints a fixed repeating-linear-gradient
  with a slow flicker; `body::after` adds the vignette + RGB shadow mask.
- **Glitch headings** — `.glitch` clones its text into `::before` / `::after`
  via `attr(data-text)`, tinting them neon purple / alert red with clipped
  `glitch-a` / `glitch-b` animations. Used through `<GlitchText />`.
- **Terminal buttons** — `.term-btn` (green), `.term-btn--neon` (purple),
  `.term-btn--alert` (red), `.term-btn--ghost` (quiet). All monospace, uppercase,
  tracked-out, with glowing borders on hover and a `>` prompt slot.
- **Frames** — `.panel` with corner brackets and an optional HUD `label`,
  available in matrix / neon / alert accents.
- Monospace is enforced on `body` and inherited everywhere; headings, forms,
  tables and buttons all use it.
- `prefers-reduced-motion` disables every animation.

## Routes

| Path         | Page            | Notes                                                   |
| ------------ | --------------- | ------------------------------------------------------- |
| `/`          | `Home`          | hero, boot log, ticker, stats, capabilities, CTA        |
| `/shop`      | `Shop`          | 6 mock tiers, filter chips, search, queue-to-cart stub  |
| `/auth`      | `Auth`          | login/register tabs + handshake log (no Supabase call)  |
| `/dashboard` | `Dashboard`     | virtual card, balance sparkline, ledger, BTC QR deposit |
| `/admin`     | `Admin`         | restricted banner, metrics, order queue, issuer health  |
| `*`          | `NotFound`      | terminal-style 404                                      |

`Layout.tsx` renders the status rail, the sticky `Navbar` (`{vCARD}` logo in
neon green; HOME / SHOP / DASHBOARD / ADMIN / SIGN OUT) and the footer.
**ADMIN only appears when `app_metadata.role === 'admin'`**; anonymous visitors
see `SIGN_IN` instead of `SIGN OUT`.

## Source layout

```
src/
├── components/
│   ├── GlitchText.tsx    # <GlitchText /> + <Panel />
│   ├── Layout.tsx        # shell: navbar + main + footer
│   ├── Navbar.tsx        # logo, nav, admin gate, mobile menu
│   ├── ScrollToTop.tsx   # resets scroll per route
│   ├── TermButton.tsx    # <TermButton /> / <TermLink />
│   └── VirtualCard.tsx   # masked card artifact
├── context/
│   ├── auth-context.ts   # AuthContext + types
│   └── AuthProvider.tsx  # session restore + role mapping
├── hooks/useAuth.ts      # typed context consumer
├── lib/supabase.ts       # Supabase singleton
├── pages/                # Home, Shop, Auth, Dashboard, Admin, NotFound
├── App.tsx               # router
├── index.css             # @theme + scanlines + glitch + components
└── main.tsx
```

## Auth shell (deliberately minimal)

`AuthProvider` restores the Supabase session (`getSession`) and subscribes to
`onAuthStateChange`; the role is read from the JWT claim
`app_metadata.role`. That is enough to gate the ADMIN nav item and the sign-out
button. Password sign-in / sign-up, profile rows and RLS policies land in the
next step — every form currently only echoes a `*_PENDING` status.

## What is mocked

Card tiers, balances, transactions, orders, issuer health and the deposit
address are hard-coded fixtures so the theme can be reviewed before the backend
exists. QR codes are generated by `qrcode.react` from that mock address.
