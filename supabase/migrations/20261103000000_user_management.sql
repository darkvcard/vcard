-- ============================================================================
-- USER_MANAGEMENT :: auth directory listing + admin role writes
-- ----------------------------------------------------------------------------
-- * `admin_get_users()` -> id, email, is_admin, created_at for every auth user
--   (SECURITY DEFINER, so the anon-key client never reads auth.users directly)
-- * admins may INSERT / UPDATE / DELETE rows in `user_roles` from the console
-- Safe to re-run: the function is only created when it is still missing and
-- every policy is dropped/re-created by name.
-- ============================================================================

-- ---------- admin_get_users --------------------------------------------------
-- Skipped when the project already defines it (a different return shape would
-- otherwise make `create or replace` fail).
do $migration$
begin
  if not exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'admin_get_users'
  ) then
    execute $fn$
      create function public.admin_get_users()
      returns table (
        id uuid,
        email text,
        is_admin boolean,
        created_at timestamptz
      )
      language sql
      security definer
      set search_path = public
      as $body$
        select u.id,
               u.email::text as email,
               exists (
                 select 1
                   from public.user_roles r
                  where r.user_id = u.id
                    and r.role = 'admin'
               ) as is_admin,
               u.created_at
          from auth.users u
         order by u.created_at desc nulls last;
      $body$;
    $fn$;
  end if;
end
$migration$;

-- Only operators may read the directory.
do $grants$
begin
  if to_regprocedure('public.admin_get_users()') is not null then
    execute 'revoke all on function public.admin_get_users() from public';
    execute 'grant execute on function public.admin_get_users() to authenticated';
  end if;
end
$grants$;

-- ---------- user_roles: admin writes ----------------------------------------
-- The console promotes by inserting an `admin` row and revokes by deleting it.
drop policy if exists "admins insert user_roles" on public.user_roles;
create policy "admins insert user_roles" on public.user_roles
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

drop policy if exists "admins update user_roles" on public.user_roles;
create policy "admins update user_roles" on public.user_roles
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "admins delete user_roles" on public.user_roles;
create policy "admins delete user_roles" on public.user_roles
  for delete to authenticated
  using (public.is_admin(auth.uid()));
