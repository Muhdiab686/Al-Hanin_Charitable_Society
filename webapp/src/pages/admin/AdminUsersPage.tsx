import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

type Row = {
  id: number
  name: string
  email: string
  role: string
  roles: string[]
}

export function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleOptions, setRoleOptions] = useState<{ value: string; case: string }[]>([])

  const [cName, setCName] = useState('مستخدم جديد')
  const [cEmail, setCEmail] = useState('')
  const [cPass, setCPass] = useState('password123')
  const [cRole, setCRole] = useState('beneficiary')

  const [uId, setUId] = useState('')
  const [uName, setUName] = useState('')
  const [uEmail, setUEmail] = useState('')
  const [uRole, setURole] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.fetchAdminUsers({ page })
      setRows((res.data as Row[]) ?? [])
      setLastPage(res.last_page)
    } catch (e) {
      setError(extractErrorMessage(e, 'تعذّر تحميل المستخدمين'))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await api.fetchAdminRoles()
        if (!cancelled) {
          setRoleOptions(r.assignable_roles ?? [])
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setError(null)
    const email = cEmail || `u${Date.now()}@hanin.test`
    try {
      await api.createAdminUser({
        name: cName,
        email,
        password: cPass,
        password_confirmation: cPass,
        role: cRole,
      })
      setMsg('تم إنشاء المستخدم.')
      setCEmail('')
      await load()
    } catch (ex) {
      setError(extractErrorMessage(ex, 'فشل الإنشاء'))
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setError(null)
    const payload: Record<string, string> = {}
    if (uName) {
      payload.name = uName
    }
    if (uEmail) {
      payload.email = uEmail
    }
    if (uRole) {
      payload.role = uRole
    }
    try {
      await api.updateAdminUser(Number(uId), payload)
      setMsg('تم التحديث.')
      await load()
    } catch (ex) {
      setError(extractErrorMessage(ex, 'فشل التحديث'))
    }
  }

  async function onDelete(id: number) {
    if (!window.confirm(`حذف المستخدم #${id}؟`)) {
      return
    }
    setMsg(null)
    setError(null)
    try {
      await api.deleteAdminUser(id)
      setMsg('تم الحذف.')
      await load()
    } catch (ex) {
      setError(extractErrorMessage(ex, 'فشل الحذف'))
    }
  }

  return (
    <div className="space-y-8 text-sm">
      {(msg || error) && (
        <div
          className={`rounded-xl px-4 py-3 ${error ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}
        >
          {error ?? msg}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">إضافة مستخدم</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="الاسم"
            value={cName}
            onChange={(e) => setCName(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            placeholder="البريد (فارغ = يُولَّد)"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            type="password"
            placeholder="كلمة المرور"
            value={cPass}
            onChange={(e) => setCPass(e.target.value)}
          />
          <select
            className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            value={cRole}
            onChange={(e) => setCRole(e.target.value)}
          >
            {roleOptions.length
              ? roleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))
              : ['admin', 'secretary', 'recording_secretary', 'beneficiary', 'donor'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 py-2 font-medium text-white sm:col-span-2"
          >
            إنشاء
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">تعديل مستخدم</h2>
        <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={onUpdate}>
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="id"
            value={uId}
            onChange={(e) => setUId(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="اسم (اختياري)"
            value={uName}
            onChange={(e) => setUName(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="بريد (اختياري)"
            value={uEmail}
            onChange={(e) => setUEmail(e.target.value)}
          />
          <input
            className="rounded-lg border border-white/15 bg-slate-950/40 px-2 py-2 text-white"
            placeholder="دور (اختياري)"
            value={uRole}
            onChange={(e) => setURole(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-white/15 py-2 text-white sm:col-span-2">
            تحديث
          </button>
        </form>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">قائمة المستخدمين</h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-white/15 px-4 py-2 text-white/90 hover:bg-white/10 disabled:opacity-40"
          >
            السابق
          </button>
          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-white/15 px-4 py-2 text-white/90 hover:bg-white/10 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-right text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-white/70">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">الاسم</th>
                  <th className="px-4 py-3 font-medium">البريد</th>
                  <th className="px-4 py-3 font-medium">الدور</th>
                  <th className="px-4 py-3 font-medium">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/90">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-white/60">{r.id}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3 text-white/80">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-100">
                        {r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void onDelete(r.id)}
                        className="rounded-lg bg-rose-600/80 px-3 py-1 text-xs text-white hover:bg-rose-600"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
