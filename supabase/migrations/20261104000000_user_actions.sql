-- ============================================================================
-- USER_MANAGEMENT :: role writes are gone
-- ----------------------------------------------------------------------------
-- Promotion / demotion was removed from the admin console. Password resets and
-- account deletions now go through the `admin-user-actions` edge function, which
-- runs with the service role key and therefore bypasses RLS. The client no
-- longer needs INSERT / UPDATE / DELETE on `public.user_roles`, so the write
-- policies added by 20261103000000_user_management.sql are dropped here.
--
-- `admin_get_users()` (read path) stays untouched.
-- Safe to re-run.
-- ============================================================================

drop policy if exists "admins insert user_roles" on public.user_roles;
drop policy if exists "admins update user_roles" on public.user_roles;
drop policy if exists "admins delete user_roles" on public.user_roles;

comment on table public.user_roles is
  'Single source of truth for admin access. Read by the app and by the admin-user-actions edge function; written server-side only.';
