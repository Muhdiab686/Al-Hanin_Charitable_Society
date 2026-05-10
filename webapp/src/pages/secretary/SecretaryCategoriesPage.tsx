import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function SecretaryCategoriesPage() {
  const [categories, setCategories] = useState<Record<string, unknown>[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<number, Record<string, string>>>({})

  async function load() {
    setErr(null)
    try {
      const r = await api.fetchCategoryRules()
      setCategories(r.categories ?? [])
    } catch (e) {
      setErr(extractErrorMessage(e, 'تعذّر التحميل'))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function field(catId: number, key: string, def: string) {
    const row = edits[catId] ?? {}
    return row[key] ?? def
  }

  function setField(catId: number, key: string, v: string) {
    setEdits((prev) => ({
      ...prev,
      [catId]: { ...(prev[catId] ?? {}), [key]: v },
    }))
  }

  async function onSave(e: FormEvent, catId: number) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const row = edits[catId] ?? {}
    try {
      await api.upsertCategoryRule(catId, {
        max_monthly_income: row.max ? Number(row.max) : null,
        min_family_members: row.min ? Number(row.min) : null,
        requires_medical_case: row.req === '1' || row.req === 'true',
        is_active: row.active !== '0' && row.active !== 'false',
      })
      setMsg('تم حفظ القاعدة.')
      await load()
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل الحفظ'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {(msg || err) && (
        <div className={`rounded-xl px-4 py-3 ${err ? 'bg-red-500/15 text-red-100' : 'bg-emerald-500/15 text-emerald-50'}`}>
          {err ?? msg}
        </div>
      )}
      <div className="space-y-4">
        {categories.map((c) => {
          const id = Number(c.id)
          const rules = (c.rules as Record<string, unknown> | undefined) ?? {}
          return (
            <form
              key={id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
              onSubmit={(e) => onSave(e, id)}
            >
              <h3 className="font-semibold text-violet-100">{String(c.name)} (#{id})</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-white/70">
                  max_monthly_income
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'max', String(rules.max_monthly_income ?? ''))}
                    onChange={(e) => setField(id, 'max', e.target.value)}
                  />
                </label>
                <label className="text-white/70">
                  min_family_members
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'min', String(rules.min_family_members ?? ''))}
                    onChange={(e) => setField(id, 'min', e.target.value)}
                  />
                </label>
                <label className="text-white/70">
                  requires_medical_case (1/0)
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'req', rules.requires_medical_case ? '1' : '0')}
                    onChange={(e) => setField(id, 'req', e.target.value)}
                  />
                </label>
                <label className="text-white/70">
                  is_active (1/0)
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'active', rules.is_active ? '1' : '0')}
                    onChange={(e) => setField(id, 'active', e.target.value)}
                  />
                </label>
              </div>
              <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium">
                حفظ القاعدة
              </button>
            </form>
          )
        })}
      </div>
    </div>
  )
}
