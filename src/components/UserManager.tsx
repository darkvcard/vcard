import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react'
import { Panel } from './GlitchText'
import { TermButton } from './TermButton'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import {
  changeAdminUserPassword,
  deleteAdminUser,
  errorMessage,
  fetchAdminUsers,
  MIN_PASSWORD_LENGTH,
} from '../lib/api'
import type { AdminUser } from '../types/db'

/** Which row is currently talking to the `admin-user-actions` edge function. */
type Busy = { id: string; action: 'password' | 'delete' } | null

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 16).replace('T', ' ')
}

function shortId(id: string) {
  return id ? `${id.slice(0, 8)}…` : '—'
}

/**
 * USER_MANAGEMENT — every auth user with two privileged actions.
 * The list comes from the `admin_get_users()` RPC; password resets and account
 * deletions are executed by the `admin-user-actions` edge function because only
 * the service role key may touch `auth.users`.
 */
export function UserManager() {
  const toast = useToast()
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [nonce, setNonce] = useState(0)

  const [busy, setBusy] = useState<Busy>(null)
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

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

  const reload = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  const refresh = useCallback(() => {
    setRefreshing(true)
    reload()
  }, [reload])

  const total = useMemo(() => (users ?? []).length, [users])

  const isSelf = useCallback(
    (row: AdminUser) => Boolean(currentUser?.id) && currentUser?.id === row.id,
    [currentUser?.id],
  )

  function openPasswordPrompt(row: AdminUser) {
    setFormError(null)
    setNewPassword('')
    setShowPassword(false)
    setPasswordTarget(row)
    setTimeout(() => passwordRef.current?.focus(), 60)
  }

  function closePasswordPrompt() {
    if (busy?.action === 'password') return
    setPasswordTarget(null)
    setNewPassword('')
    setFormError(null)
    setShowPassword(false)
  }

  async function submitPassword() {
    const target = passwordTarget
    if (!target) return

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`password_too_short — use at least ${MIN_PASSWORD_LENGTH} characters`)
      passwordRef.current?.focus()
      return
    }

    setBusy({ id: target.id, action: 'password' })
    setFormError(null)
    try {
      await changeAdminUserPassword(target.id, newPassword)
      toast.push(`password updated for ${target.email ?? shortId(target.id)}`, 'success')
      setPasswordTarget(null)
      setNewPassword('')
      reload()
    } catch (caught) {
      const message = errorMessage(caught)
      setFormError(message)
      toast.push(`password change failed :: ${message}`, 'error')
    } finally {
      setBusy(null)
    }
  }

  async function confirmDelete() {
    const target = deleteTarget
    if (!target) return

    setBusy({ id: target.id, action: 'delete' })
    try {
      await deleteAdminUser(target.id)
      toast.push(`${target.email ?? shortId(target.id)} deleted`, 'success')
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      const message = errorMessage(caught)
      toast.push(`delete failed :: ${message}`, 'error')
    } finally {
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
              Every account in the auth directory. Password resets and account deletions run
              through the
              <span className="text-matrix/80"> admin-user-actions </span>
              edge function, which re-verifies your admin JWT and only then touches
              <span className="text-matrix/80"> auth.users </span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">
              <Users className="h-3 w-3" aria-hidden="true" />
              {total} users
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
                  <th scope="col">joined</th>
                  <th scope="col" className="text-right">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const self = isSelf(row)
                  const resetting = busy?.id === row.id && busy.action === 'password'
                  const deleting = busy?.id === row.id && busy.action === 'delete'
                  return (
                    <tr key={row.id}>
                      <td className="max-w-[18rem]">
                        <p className="truncate text-bone/85" title={row.email ?? undefined}>
                          {row.email ?? '—'}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-ash/35 uppercase">
                          {shortId(row.id)}
                          {self ? ' · you' : ''}
                        </p>
                      </td>
                      <td className="whitespace-nowrap text-ash/45">{formatDate(row.createdAt)}</td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <TermButton
                            className="px-3 py-1.5 text-[9px]"
                            onClick={() => openPasswordPrompt(row)}
                            disabled={Boolean(busy)}
                            title="set a new password for this account"
                          >
                            {resetting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                ROTATING…
                              </>
                            ) : (
                              <>
                                <KeyRound className="h-3 w-3" aria-hidden="true" />
                                CHANGE PASSWORD
                              </>
                            )}
                          </TermButton>
                          <TermButton
                            variant="alert"
                            className="px-3 py-1.5 text-[9px]"
                            onClick={() => setDeleteTarget(row)}
                            disabled={Boolean(busy) || self}
                            title={
                              self
                                ? 'self_delete_blocked — another admin must delete this account'
                                : 'permanently delete this auth account'
                            }
                          >
                            {deleting ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                DELETING…
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                                DELETE USER
                              </>
                            )}
                          </TermButton>
                        </div>
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
            <UserCog className="h-3 w-3 text-matrix/60" aria-hidden="true" />
            admin-user-actions · jwt verified · service role stays server-side
          </p>
          <p className="font-mono text-[9px] tracking-[0.18em] text-ash/30 uppercase">
            change password → auth.users · delete user → irreversible
          </p>
        </div>
      </Panel>

      {passwordTarget ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <Panel label="change_password" className="relative w-full max-w-md p-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitPassword()
                }}
              >
                <p className="flex items-start gap-2 font-mono text-[10.5px] leading-relaxed tracking-[0.15em] text-matrix uppercase">
                  <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  set a new password for this account
                </p>
                <p className="mt-3 border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10px] tracking-[0.12em] break-all text-ash/60">
                  {passwordTarget.email ?? 'unknown_email'} · {shortId(passwordTarget.id)}
                </p>

                <div className="mt-4">
                  <label htmlFor="new-password" className="field-label">
                    new_password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value)
                        if (formError) setFormError(null)
                      }}
                      placeholder={`min ${MIN_PASSWORD_LENGTH} characters`}
                      spellCheck={false}
                      autoComplete="new-password"
                      className="field-term pr-10"
                      disabled={busy?.action === 'password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border border-white/10 p-1.5 text-ash/60 transition-colors hover:border-matrix/50 hover:text-matrix"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-ash/35 uppercase">
                    minimum {MIN_PASSWORD_LENGTH} characters · takes effect on the next sign-in
                  </p>
                </div>

                {formError ? (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 border border-alert/40 bg-alert/5 px-3 py-2 font-mono text-[10px] tracking-[0.15em] text-[#ff849b] uppercase"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    {formError}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <TermButton
                    type="submit"
                    className="flex-1 py-2"
                    prompt="&gt;"
                    disabled={busy?.action === 'password'}
                  >
                    {busy?.action === 'password' ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ROTATING…
                      </>
                    ) : (
                      'WRITE_PASSWORD'
                    )}
                  </TermButton>
                  <TermButton
                    variant="ghost"
                    className="py-2 sm:w-32"
                    onClick={closePasswordPrompt}
                    disabled={busy?.action === 'password'}
                  >
                    CANCEL
                  </TermButton>
                </div>
              </form>
            </Panel>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <Panel accent="alert" label="confirm_delete" className="relative w-full max-w-md p-5">
              <p className="flex items-start gap-2 font-mono text-[10.5px] leading-relaxed tracking-[0.15em] text-[#ff849b] uppercase">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                are you sure you want to delete this user?
              </p>
              <p className="mt-3 border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10px] tracking-[0.12em] break-all text-ash/60">
                {deleteTarget.email ?? 'unknown_email'} · {shortId(deleteTarget.id)} · joined{' '}
                {formatDate(deleteTarget.createdAt)}
              </p>
              <p className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.18em] text-ash/35 uppercase">
                the auth account is removed permanently · this cannot be undone
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <TermButton
                  variant="alert"
                  className="flex-1 py-2"
                  onClick={() => void confirmDelete()}
                  disabled={busy?.action === 'delete'}
                >
                  {busy?.action === 'delete' ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      DELETING…
                    </>
                  ) : (
                    'CONFIRM_DELETE'
                  )}
                </TermButton>
                <TermButton
                  variant="ghost"
                  className="py-2 sm:w-32"
                  onClick={() => {
                    if (busy?.action !== 'delete') setDeleteTarget(null)
                  }}
                  disabled={busy?.action === 'delete'}
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

