-- ============================================================================
-- {vCARD} :: reference schema
-- Mirrors exactly what the app reads/writes. Run it in the Supabase SQL editor
-- (or as a migration) before pointing the frontend at a real project.
-- ============================================================================

-- ---------- helper: admin check (no recursive RLS) --------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'admin'
  );
$$;

-- ---------- cards -----------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  brand text not null default 'VISA',
  price_usd numeric(10, 2) not null default 0,
  stock_status text not null default 'in_stock'
    check (stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
  load_limit text,
  monthly_limit text,
  perks text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.cards enable row level security;

-- The shop is public; only admin tooling writes cards.
create policy "cards are public" on public.cards
  for select using (true);

create policy "admins insert cards" on public.cards
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "admins update cards" on public.cards
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "admins delete cards" on public.cards
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- ---------- user_roles ------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create policy "read own role" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- ---------- orders ----------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id),
  amount_usd numeric(10, 2) not null,
  crypto_method text not null,
  txid text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  delivery_details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

create policy "operators read own orders" on public.orders
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Users may only open a pending order for themselves; status is not client-set.
create policy "operators create own pending orders" on public.orders
  for insert with check (auth.uid() = user_id and status = 'pending');

-- Admins may purge an order from the console (DELETE action, destructive).
create policy "admins delete orders" on public.orders
  for delete using (public.is_admin(auth.uid()));

-- ---------- card_units (real deliverable inventory) -------------------------
-- One row per sellable card. `delivery_details` carries what the buyer gets:
--   { "details": "<pasted card material>", "image_url": "<public storage url>" }
create table if not exists public.card_units (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  delivery_details jsonb not null default '{}'::jsonb,
  is_sold boolean not null default false,
  order_id uuid references public.orders (id) on delete set null,
  sold_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists card_units_card_id_idx on public.card_units (card_id);
create index if not exists card_units_is_sold_idx on public.card_units (is_sold);

alter table public.card_units enable row level security;

-- Inventory is operator-only: buyers only ever see the unit copied into their order.
create policy "admins read card units" on public.card_units
  for select using (public.is_admin(auth.uid()));

create policy "admins insert card units" on public.card_units
  for insert with check (public.is_admin(auth.uid()));

create policy "admins update card units" on public.card_units
  for update using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "admins delete card units" on public.card_units
  for delete using (public.is_admin(auth.uid()));

-- ---------- role bootstrap --------------------------------------------------
-- Every new auth user gets a 'user' row; promote to admin manually.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- admin approval RPC ---------------------------------------------
-- Called from the admin console as:
--   supabase.rpc('resolve_payment', { p_order_id, p_approve: true })
create or replace function public.resolve_payment(p_order_id uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  unit_row public.card_units%rowtype;
  has_unit boolean := false;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into order_row from public.orders where id = p_order_id;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if p_approve then
    -- Prefer a real uploaded unit; fall back to the demo payload when the
    -- product has no inventory rows yet.
    select * into unit_row
      from public.card_units
     where card_id = order_row.card_id
       and is_sold = false
     order by created_at
     limit 1
     for update;

    has_unit := found;

    if has_unit then
      update public.card_units
         set is_sold = true,
             order_id = p_order_id,
             sold_at = now()
       where id = unit_row.id;
    end if;

    update public.orders
       set status = 'completed',
           delivery_details = case
             when has_unit then unit_row.delivery_details
             else coalesce(
               delivery_details,
               jsonb_build_object(
                 'brand', 'VISA',
                 'card_number', '4021 0000 0000 4021',
                 'expiry', '09/29',
                 'cvc', '417'
               )
             )
           end
     where id = p_order_id
    returning * into order_row;
  else
    update public.orders
       set status = 'failed'
     where id = p_order_id
    returning * into order_row;
  end if;

  return jsonb_build_object('ok', true, 'status', order_row.status);
end;
$$;

revoke all on function public.resolve_payment(uuid, boolean) from public;
grant execute on function public.resolve_payment(uuid, boolean) to authenticated;

-- ---------- storage: card screenshots ---------------------------------------
-- Public bucket used by INVENTORY_MANAGEMENT to attach a card image to a unit.
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do update set public = true;

create policy "card images are public" on storage.objects
  for select using (bucket_id = 'card-images');

create policy "admins upload card images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'card-images' and public.is_admin(auth.uid()));

create policy "admins update card images" on storage.objects
  for update to authenticated
  using (bucket_id = 'card-images' and public.is_admin(auth.uid()))
  with check (bucket_id = 'card-images' and public.is_admin(auth.uid()));

create policy "admins delete card images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'card-images' and public.is_admin(auth.uid()));
