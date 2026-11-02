# {vCARD} — darkweb virtual debit card store

An aggressive CRT / hacker-terminal storefront for a virtual debit card service,
built with Vite + React + TypeScript, Supabase auth/data and a Tailwind v4 theme.
The UI shell, the auth flow, the shop, crypto checkout, the operator dashboard and
the admin approval console are all wired up.

## Stack

| Layer    | Choice                                           |
| -------- | ------------------------------------------------ |
| Build    | Vite 8 + React 19 + TypeScript                   |
| Styling  | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first) |
| Backend  | Supabase (`@supabase/supabase-js`)               |
| Routing  | `react-router-dom` v7                            |
| Icons    | `lucide-react`                                   |
| QR codes | `qrcode.react`                                   |

## Getting started

```bash
npm install
cp .env.example .env      # already present with placeholders
npm run dev               # http://localhost:5173
npm run build             # tsc -b && vite build
npm run lint              # oxlint
```

### Environment

```
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"
```

`src/lib/supabase.ts` exports the singleton client plus `isSupabaseConfigured`.
When the variables are missing the app still boots and the shop falls back to
demo fixtures (clearly flagged with a `demo_data` banner).

### Database

Run [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL editor.
It creates everything the frontend expects:

| Table        | Columns used by the app                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| `cards`      | `id, name, description, brand, price_usd, stock_status, load_limit, monthly_limit, perks, image_url` |
| `user_roles` | `user_id, role` (`user` / `admin`)                                                                         |
| `orders`     | `id, user_id, card_id, amount_usd, crypto_method, txid, status, delivery_details, created_at`              |
| `card_units` | `id, card_id, delivery_details, is_sold, order_id, sold_at, created_at`                                    |

`card_units` holds the real, sellable card material uploaded from
`INVENTORY_MANAGEMENT`; `delivery_details` is a JSON object
(`{ details, text, image_url }`) where `image_url` points at the public
`card-images` storage bucket. `mapCard` also tolerates the alternative column
names `card_name` / `price_in_usd` on `cards`, so an existing project keeps
working without a migration.

Approve on a pending order hands the buyer the oldest unsold unit for that
product and marks it sold; when the product has no units yet the demo payload
is used so the queue never blocks.

Plus the `resolve_payment(p_order_id uuid, p_approve boolean)` RPC (SECURITY
DEFINER, admin-only), RLS policies (operators only see their own orders, only
admins see everything) and a trigger that gives every new auth user a
`user_roles` row. Promote an operator to admin with:

```sql
update public.user_roles set role = 'admin' where user_id = '<uuid>';
```

Email confirmation should stay **disabled** in Supabase Auth → Providers → Email
so `signUp` returns a session immediately.

## Business logic

### 1. Authentication — `src/pages/Auth.tsx`, `src/context/AuthProvider.tsx`

- `supabase.auth.signUp({ email, password })` and
  `supabase.auth.signInWithPassword(...)`; no OAuth, no email verification.
- If `signUp` somehow returns a user without a session, the page immediately
  calls `signInWithPassword` to open one.
- On success → `navigate('/dashboard', { replace: true })`; failures render a
  terminal-style `role="alert"` panel plus an error toast.
- `AuthProvider` restores the session with `getSession()`, subscribes to
  `onAuthStateChange`, and resolves the role from **`user_roles`**
  (`fetchUserRole` in `src/lib/api.ts`) — never from client-editable metadata.
  The role lookup is deferred out of the auth callback to avoid Supabase's
  internal lock.
- `/auth` is wrapped in `<SignedOutOnly>` (signed-in users bounce to the console).

### 2. Shop — `src/pages/Shop.tsx`

- Loads `select('*') from cards`, normalises rows (`src/lib/api.ts` → `mapCard`)
  and sorts by price.
- Loading skeleton, error panel with `RETRY_SYNC`, empty-search state, search +
  `ALL / IN STOCK / LOW STOCK / OUT OF STOCK` filters and a `SYNC` button.
- A product with `image_url` renders the full artwork inside a card-shaped
  (`aspect-[1.6/1]`) frame with `object-contain`, so nothing is cropped;
  products without artwork keep the CSS-drawn panel.
- `cards.description` is the loaded balance: the shop prints it as a large
  glowing `BALANCE: $50` line (bare numbers get a `$` prefix) instead of prose.
- Stock is shown once per card — the chip under the details
  (`IN STOCK` / `LOW STOCK` / `SOLD OUT`), with a red disabled button when sold
  out.

### 3. Checkout — `src/components/CheckoutDialog.tsx`

- Terminal modal (`role="dialog"`, Esc/backdrop close, scroll lock) opened from
  `BUY NOW`. The overlay is `fixed inset-0 overflow-y-auto`, the panel is
  capped at `max-h-[90vh]` and its body (`min-h-0 flex-1 overflow-y-auto`)
  scrolls independently, while the TXID field, balance, `CONFIRM PAYMENT` and
  `ABORT` footer stay reachable on small screens.
- Header shows the selected product exactly as listed: `mapCard` reads
  `card_name`/`price_in_usd` (falling back to `name`/`price_usd`) and the dialog
  re-reads `card.raw` before printing, so it can never fall back to
  `UNNAMED_CARD` / `0.00 USDT` for a listed card. The loaded balance is printed
  as a glowing `BALANCE: $50` line.
- Rail dropdown: **USDT - BEP20** (`0x35aec7E35F65ea227e49fDd321709D52Ada389E4`)
  and **USDT - Solana** (`3mjR2gV3MJrudjus9yBuh3EtSMw6Ca5BVFcYiMDa1VjQ`), with a
  live `qrcode.react` QR, network/confirmation hints and a copy-address button.
- TXID field (validated non-empty and ≥16 chars).
- `CONFIRM PAYMENT`:
  - no session → inline error + toast → redirect to `/auth`;
  - otherwise inserts `orders { user_id, card_id, amount_usd, crypto_method,
    txid, status: 'pending' }`, shows a success toast, closes and redirects to
    `/dashboard`.

### 4. Dashboard — `src/pages/Dashboard.tsx`

- Fetches `orders` filtered by `user_id` (newest first client-side).
- `orders` only stores `card_id`; `fetchOrders()` joins `cards` client-side
  (`id, name` → legacy `id, card_name` → `select('*')`) and fills
  `order.cardName`, so the log prints the real product name instead of
  `UNKNOWN_CARD` (deleted products fall back to `CARD_<short id>`).
- Aggregate panel: settled spend, orders / pending / delivered counts, clearance.
- Order log with status chips (`PENDING`, `COMPLETED`, `FAILED`), crypto method,
  short id, timestamp and copyable TXID.
- Completed orders render `order.delivery_details` (card number, expiry, CVC,
  brand — object or plain string) with per-field copy buttons; the virtual card
  shows the delivered last-4/expiry.
- Refresh, error-with-retry and empty states.

### 5. Admin — `src/pages/Admin.tsx`

- `/admin` is wrapped in `<ProtectedRoute requireAdmin>`: anonymous → `/auth`,
  signed-in non-admin → `NO_CLEARANCE` screen (no data is fetched).
- Three sections behind a tab bar: **PAYMENT_QUEUE**, **INVENTORY_MANAGEMENT**
  and **PRODUCT_MANAGEMENT**.
- Fetches every order, resolves card names client-side, and renders
  **Order ID · User ID · Card · Crypto Method · TXID · Status · Actions**.
- `APPROVE` on a pending order calls
  `supabase.rpc('resolve_payment', { p_order_id, p_approve: true })`, toasts the
  result and refetches the queue (row flips to COMPLETED + `delivery_details`).
- `DECLINE` calls the same RPC with `p_approve: false` (order becomes `failed`),
  and `DELETE` purges the row from `public.orders` after a confirmation dialog.
  Both update the table optimistically and then resync from Supabase.

#### INVENTORY_MANAGEMENT — `src/components/InventoryManager.tsx`

- Product dropdown (`cards`), a textarea that takes one card per line, and an
  `<input type="file" accept="image/*" />` screenshot picker.
- The screenshot is uploaded to the **`card-images`** storage bucket and its
  public URL is written into each unit's `delivery_details` next to the pasted
  text — one `card_units` row per line.
- Below the form, a table lists every unsold unit for the selected product with
  the screenshot preview (or an `no image` placeholder), the pasted details,
  the insert timestamp and the availability chip.

#### PRODUCT_MANAGEMENT — `src/components/ProductManager.tsx`

- Creates and edits rows in `cards`: **card_name**, **card_type**
  (`VISA` / `MASTERCARD` / `AMEX`), **price_usd**, **card_balance** (stored in
  `cards.description`, rendered as `BALANCE: $100` in the shop/checkout),
  **stock_status** (`in_stock` / `low_stock` / `out_of_stock`) and an optional
  `<input type="file" accept="image/*" />`.
- The artwork is uploaded to the **`card-images`** bucket and the public URL is
  saved in `cards.image_url` (see
  [`supabase/migrations/20261102000000_cards_product_management.sql`](supabase/migrations/20261102000000_cards_product_management.sql),
  which also widens `stock_status` to allow `low_stock` and adds the admin
  INSERT / UPDATE / DELETE policies on `cards`).
- The table below lists every product with thumbnail, name, type, price and
  stock chip. `EDIT` loads the row back into the form (`SAVE_CHANGES`);
  `DELETE` purges the row after a confirmation dialog.

## Theme

Tailwind v4 is CSS-first: the whole config lives in `@theme` inside
`src/index.css`.

| Token / utility          | Value                                    |
| ------------------------ | ---------------------------------------- |
| `bg-void`                | `#050505` deep black                     |
| `text-matrix`            | `#00FF41` matrix green                   |
| `text-neon`              | `#9D00FF` neon purple                    |
| `text-alert`             | `#FF003C` alert red                      |
| `font-mono`              | JetBrains Mono → Fira Code → Courier New |
| `animate-glitch-a/b`     | chromatic glitch layers                  |
| `animate-blink`          | terminal caret                           |
| `animate-marquee`        | crypto ticker                            |

- **CRT scanlines** — `body::before` fixed repeating gradient + flicker;
  `body::after` adds the vignette / RGB shadow mask.
- **Glitch headings** — `.glitch` clones text with `attr(data-text)` into purple
  and red clipped layers (`<GlitchText />`).
- **Terminal buttons** — `.term-btn` (+ `--neon`, `--alert`, `--ghost`) with a
  `>` prompt slot and glowing borders on hover.
- `prefers-reduced-motion` disables every animation.

## Routes

| Path         | Page        | Guard                          |
| ------------ | ----------- | ------------------------------ |
| `/`          | Home        | public                         |
| `/shop`      | Shop        | public                         |
| `/auth`      | Auth        | redirects signed-in users      |
| `/dashboard` | Dashboard   | session required               |
| `/admin`     | Admin       | session + `user_roles` = admin |
| `*`          | NotFound    | public                         |

`Layout.tsx` renders the status rail, sticky `Navbar` (`{vCARD}` logo, HOME /
SHOP / DASHBOARD / ADMIN / SIGN OUT) and footer. ADMIN only appears once the
`user_roles` lookup returns `admin`.

## Source layout

```
src/
├── components/
│   ├── CheckoutDialog.tsx  # crypto rail picker, QR, TXID, order insert
│   ├── GlitchText.tsx      # <GlitchText /> + <Panel />
│   ├── InventoryManager.tsx # inventory tab: card_units upload + unsold table
│   ├── Layout.tsx          # shell: navbar + main + footer
│   ├── Navbar.tsx          # logo, nav, admin gate, mobile menu
│   ├── ProtectedRoute.tsx  # session / admin guards + boot screen
│   ├── ScrollToTop.tsx
│   ├── TermButton.tsx      # <TermButton /> / <TermLink />
│   ├── ToastProvider.tsx   # terminal toast queue
│   └── VirtualCard.tsx     # masked card artifact
├── context/
│   ├── auth-context.ts
│   ├── AuthProvider.tsx    # session restore + user_roles lookup
│   └── toast-context.ts
├── hooks/
│   ├── useAuth.ts
│   └── useToast.ts
├── lib/
│   ├── api.ts              # cards / orders / role / order insert / RPC
│   ├── crypto.ts           # rails + deposit addresses
│   └── supabase.ts         # client singleton
├── pages/                  # Home, Shop, Auth, Dashboard, Admin, NotFound
├── types/db.ts             # Card / Order / NewOrder models
├── App.tsx                 # providers + routes + guards
├── index.css               # @theme + scanlines + glitch + components
└── main.tsx
```

## Notes & assumptions

- `delivery_details` may be a JSON object (`card_number`, `expiry`, `cvc`,
  `brand`, `holder`) or a plain string — both render on the dashboard. Uploaded
  units store `{ details, image_url }`, which the dashboard renders as text plus
  the screenshot preview.
- Order status is only ever written by the client as `pending`; approvals go
  through the `resolve_payment` RPC so RLS never needs an UPDATE policy.
- Payment verification is manual by design: paste TXID → admin approves on-chain.
- Home page metrics remain decorative copy; shop/dashboard/admin data is live.
