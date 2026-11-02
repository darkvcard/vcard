import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
} from 'lucide-react'
import { Panel } from './GlitchText'
import { TermButton } from './TermButton'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { errorMessage, fetchAdminUsers, grantAdminRole, revokeAdminRole } from '../lib/api'
import type { AdminUser } from '../types/db'

type RoleAction = 'promote' | 'demote'

/** The action waiting for the operator to confirm. */
type PendingAction = { user: AdminUser; action: RoleAction }

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

function shortId(id: string) {
  return id ? `${id.slice(0, 8)}…` : '—'
}

function roleLabel(isAdmin: boolean) {
  return isAdmin ? 'ADMIN' : 'USER'
}

/** Clear operator hint when the project is missing the admin write policies. */
function actionHint(message: string) {
  return /row-level security|permission denied|42501|does not exist|schema cache/i.test(message)
    ? `${message} · user_roles needs the admin write policies — run supabase/migrations/20261103000000_user_management.sql`
    : message
}

/**
 * USER_MANAGEMENT — every auth user with their current role.
 * The list comes from the `admin_get_users()` RPC (SECURITY DEFINER), while
 * promotion writes / revoking deletes the `admin` row in `user_roles`.
 */
export function UserManager() {
  const toast = useToast()
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)

  const [busy, setBusy] = useState<{ id: string; action: RoleAction } | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [working, setWorking] = useState(false)

  const loading = users === null && !error

  useEffect(() => {
    let cancelled = false

    fetchAdminUsers()
      .then((rows) => {
        if (cancelled) return
        setUsers(rows)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setUsers(null)
        setError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false)
      })

    return () => {
      cancelled = true
    }
  }, [nonce])

  /** Refetches immediately after a successful role change. */
  const reload = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  const refresh = useCallback(() => {
    setRefreshing(true)
    reload()
  }, [reload])

  const metrics = useMemo(() => {
    const rows = users ?? []
    return {
      total: rows.length,
      admins: rows.filter((row) => row.isAdmin).length,
    }
  }, [users])

  const isSelf = useCallback(
    (row: AdminUser) => Boolean(currentUser?.id) && currentUser?.id === row.id,
    [currentUser?.id],
  )

  async function applyRole({ user: target, action }: PendingAction) {
    setWorking(true)
    setBusy({ id: target.id, action })
    try {
      if (action === 'promote') {
        await grantAdminRole(target.id)
        toast.push(`${target.email ?? shortId(target.id)} promoted to admin`, 'success')
      } else {
        await revokeAdminRole(target.id)
        toast.push(`${target.email ?? shortId(target.id)} admin access revoked`, 'success')
      }
      setPending(null)
      reload()
    } catch (caught) {
      const message = actionHint(errorMessage(caught))
      toast.push(`${action === 'promote' ? 'promotion' : 'revoke'} failed :: ${message}`, 'error')
    } finally {
      setWorking(false)
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <Panel label="user_management" className="p-0">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-matrix/80">
              USER_MANAGEMENT
            </h2>
            <p className="mt-2 max-w-xl font-mono text-[10.5px] leading-relaxed text-ash/55">
              Every account in the auth directory with its effective role. The list is served by the
              <span className="text-matrix/80"> admin_get_users </span>
              RPC; promotion writes an
              <span className="text-matrix/80"> admin </span>
              row into
              <span className="text-matrix/80"> user_roles </span>
              and revoking removes only that row.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              <Users className="h-3 w-3" aria-hidden="true" />
              {metrics.total} users
            </span>
            <span className="chip">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {metrics.admins} admins
            </span>
            <TermButton
              variant="ghost"
              className="px-3 py-1.5"
              onClick={refresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-3 w-3 ${loading || refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              REFRESH
            </TermButton>
          </div>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 border-t border-white/5 px-4 py-10 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-matrix/70" aria-hidden="true" />
            loading auth directory…
          </p>
        ) : null}

        {error ? (
          <div className="border-t border-alert/30 bg-alert/[0.06] px-4 py-6">
            <p className="flex items-start gap-2 font-mono text-[10.5px] leading-relaxed tracking-[0.14em] text-[#ff849b] uppercase">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              admin_get_users failed :: {error}
            </p>
            <TermButton variant="ghost" className="mt-3 px-3 py-1.5" onClick={refresh}>
              RETRY
            </TermButton>
          </div>
        ) : null}

        {!error && !loading && users !== null && users.length === 0 ? (
          <p className="border-t border-white/5 px-4 py-10 font-mono text-[11px] tracking-[0.2em] text-ash/50 uppercase">
            no accounts in the auth directory yet
          </p>
        ) : null}

        {!error && users !== null && users.length > 0 ? (
          <div className="overflow-x-auto border-t border-white/5">
            <table className="table-term">
              <thead>
                <tr>
                  <th scope="col">email</th>
                  <th scope="col">role</th>
                  <th scope="col">joined</th>
                  <th scope="col" className="text-right">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const acting = busy?.id === row.id
                  const self = isSelf(row)
                  return (
                    <tr key={row.id}>
                      <td className="max-w-[16rem]">
                        <p className="truncate text-bone/85" title={row.email ?? undefined}>
                          {row.email ?? '—'}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-ash/35 uppercase">
                          {shortId(row.id)}
                          {self ? ' · you' : ''}
                        </p>
                      </td>
                      <td className="whitespace-nowrap">
                        <span
                          className={`chip ${row.isAdmin ? '' : 'chip-neon'}`}
                          title={row.isAdmin ? 'holds the admin role' : 'standard operator'}
                        >
                          {row.isAdmin ? (
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <UserCog className="h-3 w-3" aria-hidden="true" />
                          )}
                          {roleLabel(row.isAdmin)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-ash/45">{formatDate(row.createdAt)}</td>
                      <td className="text-right whitespace-nowrap">
                        {row.isAdmin ? (
                          <TermButton
                            variant="alert"
                            className="px-3 py-1.5 text-[9px]"
                            onClick={() => setPending({ user: row, action: 'demote' })}
                            disabled={acting || working || self}
                            title={
                              self
                                ? 'self_demotion_blocked — another admin must revoke your access'
                                : 'remove the admin role from this account'
                            }
                          >
                            {acting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                REVOKING…
                              </>
                            ) : (
                              <>
                                <ShieldOff className="h-3 w-3" aria-hidden="true" />
                                REVOKE ADMIN
                              </>
                            )}
                          </TermButton>
                        ) : (
                          <TermButton
                            className="px-3 py-1.5 text-[9px]"
                            prompt="&gt;"
                            onClick={() => setPending({ user: row, action: 'promote' })}
                            disabled={acting || working}
                          >
                            {acting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                PROMOTING…
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                                MAKE ADMIN
                              </>
                            )}
                          </TermButton>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-ash/40 uppercase">
            <ShieldCheck className="h-3 w-3 text-matrix/60" aria-hidden="true" />
            admin_get_users is SECURITY DEFINER · role writes are RLS guarded
          </p>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ash/30 uppercase">
            make admin → insert admin role · revoke → delete admin role only
          </p>
        </div>
      </Panel>

      {pending ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <Panel
              accent="alert"
              label={pending.action === 'promote' ? 'confirm_promotion' : 'confirm_revoke'}
              className="relative w-full max-w-md p-5"
            >
              <p className="flex items-start gap-2 font-mono text-[10.5px] leading-relaxed tracking-[0.15em] text-[#ff849b] uppercase">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {pending.action === 'promote'
                  ? 'are you sure you want to make this user an admin?'
                  : 'are you sure you want to revoke admin access for this user?'}
              </p>
              <p className="mt-3 border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10px] tracking-[0.12em] break-all text-ash/60">
                {pending.user.email ?? 'unknown_email'} · {shortId(pending.user.id)} ·{' '}
                {roleLabel(pending.user.isAdmin)}
              </p>
              <p className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.18em] text-ash/35 uppercase">
                {pending.action === 'promote'
                  ? 'user_roles gains an admin row · full console access is granted'
                  : 'the admin row is deleted · the user role stays intact'}
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <TermButton
                  variant={pending.action === 'promote' ? 'matrix' : 'alert'}
                  className="flex-1 py-2"
                  onClick={() => void applyRole(pending)}
                  disabled={working}
                >
                  {working ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      WRITING…
                    </>
                  ) : pending.action === 'promote' ? (
                    'CONFIRM_MAKE_ADMIN'
                  ) : (
                    'CONFIRM_REVOKE_ADMIN'
                  )}
                </TermButton>
                <TermButton
                  variant="ghost"
                  className="py-2 sm:w-32"
                  onClick={() => setPending(null)}
                  disabled={working}
                >
                  CANCEL
                </TermButton>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  )
}

