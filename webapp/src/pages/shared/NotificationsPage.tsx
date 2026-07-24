import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import { useAuth } from '../../auth/useAuth'

type NotificationRow = Record<string, unknown> & {
  id: string
  read_at?: string | null
  data?: {
    title?: string
    message?: string
    action_url?: string | null
    meta?: {
      appointment_id?: number | string
      beneficiary_id?: number | string
      [key: string]: unknown
    }
  }
  created_at?: string | null
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await api.fetchNotifications({ page: 1 })
      setRows(((res.data as NotificationRow[]) ?? []).filter((row) => typeof row.id === 'string'))
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر تحميل الإشعارات'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onMarkAsRead(id: string) {
    setErr(null)
    try {
      await api.markNotificationAsRead(id)
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تحديث الإشعار'))
    }
  }

  async function onMarkAll() {
    setErr(null)
    setMsg(null)
    try {
      await api.markAllNotificationsAsRead()
      setMsg('تم تعليم جميع الإشعارات كمقروءة.')
      await load()
    } catch (e) {
      setErr(extractErrorMessage(e, 'فشل تحديث جميع الإشعارات'))
    }
  }

  function normalizeActionUrl(rawUrl?: string | null): string | null {
    if (!rawUrl || rawUrl.trim() === '') {
      return null
    }

    const url = rawUrl.trim()
    if (!url.startsWith('/')) {
      return url
    }

    if (!url.startsWith('/app/')) {
      return url
    }

    if (!user?.role) {
      return url
    }

    const roleRouteMap: Record<string, string> = {
      admin: 'admin',
      secretary: 'secretary',
      recording_secretary: 'recording-secretary',
      accountant: 'accountant',
      doctor: 'doctor',
      storekeeper: 'storekeeper',
      volunteer: 'volunteer',
      beneficiary: 'beneficiary',
      donor: 'donor',
    }

    const currentRolePath = roleRouteMap[user.role]
    if (!currentRolePath) {
      return url
    }

    const qIdx = url.indexOf('?')
    const pathOnly = qIdx >= 0 ? url.slice(0, qIdx) : url
    const query = qIdx >= 0 ? url.slice(qIdx) : ''
    const parts = pathOnly.split('/')
    if (parts.length < 4) {
      return url
    }

    const knownRoleSegments = new Set(Object.values(roleRouteMap))
    if (!knownRoleSegments.has(parts[2])) {
      return url
    }

    // صفحة العيادة: السكرتير /admin (overview) فقط
    if (parts[3] === 'clinic') {
      if (user.role === 'admin') {
        return `/app/admin/clinic/overview${query}`
      }
      if (user.role === 'secretary') {
        return `/app/secretary/clinic${query}`
      }
      // أمين السر وغيره: أبقِ رابط السكرتير مع المعرّف (قد يحتاج صلاحية لاحقاً)
      return `/app/secretary/clinic${query}`
    }

    parts[2] = currentRolePath
    return `${parts.join('/')}${query}`
  }

  function resolveAppointmentId(row: NotificationRow): number | null {
    const fromMeta = row.data?.meta?.appointment_id
    if (fromMeta != null && String(fromMeta).trim() !== '') {
      const n = Number(fromMeta)
      if (Number.isFinite(n) && n > 0) {
        return n
      }
    }

    const rawUrl = row.data?.action_url
    if (!rawUrl) {
      return null
    }
    try {
      const q = rawUrl.includes('?') ? new URLSearchParams(rawUrl.slice(rawUrl.indexOf('?') + 1)) : null
      const fromUrl = q?.get('appointment_id')
      if (fromUrl) {
        const n = Number(fromUrl)
        if (Number.isFinite(n) && n > 0) {
          return n
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }

  function resolveActionUrl(row: NotificationRow): string | null {
    let url = normalizeActionUrl(row.data?.action_url)
    if (!url) {
      return null
    }

    const appointmentId = resolveAppointmentId(row)
    if (appointmentId != null && !url.includes('appointment_id=')) {
      const sep = url.includes('?') ? '&' : '?'
      url = `${url}${sep}appointment_id=${appointmentId}`
    }

    return url
  }

  async function onOpenNotification(row: NotificationRow) {
    const actionUrl = resolveActionUrl(row)
    const appointmentId = resolveAppointmentId(row)
    if (actionUrl) {
      navigate(actionUrl, {
        state: appointmentId != null ? { focusAppointmentId: appointmentId } : undefined,
      })
    }
    if (!row.read_at) {
      await onMarkAsRead(row.id)
    }
  }

  return (
    <div className="space-y-5 text-sm text-white/85">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/20 text-red-100' : 'bg-emerald-500/20 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">الإشعارات</h2>
          <button
            type="button"
            onClick={() => void onMarkAll()}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white"
          >
            تعليم الكل كمقروء
          </button>
        </div>

        {loading ? <p className="mt-4 text-white/60">جاري التحميل…</p> : null}

        <ul className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <li className="rounded-lg border border-white/10 bg-black/20 px-3 py-4 text-white/60">لا توجد إشعارات حالياً.</li>
          ) : (
            rows.map((row) => (
              <li
                key={row.id}
                className={`rounded-lg border px-3 py-3 ${
                  row.read_at ? 'border-white/10 bg-black/20 text-white/70' : 'border-violet-300/30 bg-violet-500/10 text-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{String(row.data?.title ?? 'إشعار')}</p>
                    <p className="mt-1 text-xs text-white/75">{String(row.data?.message ?? '')}</p>
                    <p className="mt-2 text-[11px] text-white/45">{String(row.created_at ?? '').replace('T', ' ').slice(0, 19)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {resolveActionUrl(row) ? (
                      <button
                        type="button"
                        className="rounded-md border border-sky-300/35 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-50"
                        onClick={() => void onOpenNotification(row)}
                      >
                        التوجه له
                      </button>
                    ) : null}
                    {!row.read_at ? (
                      <button
                        type="button"
                        className="rounded-md border border-white/20 px-2 py-1 text-[11px]"
                        onClick={() => void onMarkAsRead(row.id)}
                      >
                        مقروء
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}
