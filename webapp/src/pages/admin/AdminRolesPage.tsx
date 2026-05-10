import { useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function AdminRolesPage() {
  const [roles, setRoles] = useState<{ name: string; permissions: string[] }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.fetchAdminRoles()
        if (!cancelled) {
          setRoles(d.roles)
        }
      } catch (e) {
        if (!cancelled) {
          setError(extractErrorMessage(e, 'تعذّر تحميل الأدوار'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-6 py-8 text-red-100">{error}</div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">الأدوار والصلاحيات</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => (
          <article
            key={r.name}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur"
          >
            <h3 className="text-base font-bold capitalize text-indigo-100">{r.name}</h3>
            <p className="mt-3 text-xs font-medium text-white/50">
              {r.permissions.length} صلاحية
            </p>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs text-white/75">
              {r.permissions.map((p) => (
                <li key={p} className="rounded-lg bg-slate-950/40 px-2 py-1">
                  {p}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
