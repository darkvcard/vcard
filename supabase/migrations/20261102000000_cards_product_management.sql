-- ============================================================================
-- PRODUCT_MANAGEMENT :: cards catalog writes + artwork
-- ----------------------------------------------------------------------------
-- * adds `cards.image_url` for the artwork uploaded from the admin panel
-- * widens `cards.stock_status` to accept `low_stock`
-- * grants admins INSERT / UPDATE / DELETE on `cards` (RLS stays enabled)
-- Safe to re-run.
-- ============================================================================

-- ---------- artwork column ---------------------------------------------------
alter table public.cards
  add column if not exists image_url text;

comment on column public.cards.image_url is
  'Public URL of the product artwork in the card-images storage bucket.';

-- ---------- stock_status: in_stock | low_stock | out_of_stock ---------------
-- Drop whatever check constraint currently guards stock_status (older projects
-- may have named it differently), then re-create it with low_stock included.
do $$
declare
  con record;
begin
  for con in
    select conname
      from pg_constraint
     where conrelid = 'public.cards'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%stock_status%'
  loop
    execute format('alter table public.cards drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.cards
  add constraint cards_stock_status_check
  check (stock_status in ('in_stock', 'low_stock', 'out_of_stock'));

-- ---------- admin writes -----------------------------------------------------
-- The shop keeps its public SELECT policy; only admins may mutate the catalog.
drop policy if exists "admins insert cards" on public.cards;
create policy "admins insert cards" on public.cards
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "admins update cards" on public.cards;
create policy "admins update cards" on public.cards
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "admins delete cards" on public.cards;
create policy "admins delete cards" on public.cards
  for delete to authenticated
  using (public.is_admin(auth.uid()));
