import { type FormEvent, useEffect, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

const HOUSING_OPTIONS = [
  { value: 'owned', label: 'ملك' },
  { value: 'rented', label: 'إيجار' },
  { value: 'hosted', label: 'ضيافة' },
  { value: 'unstable', label: 'غير مستقر' },
] as const

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

  function housingChecked(catId: number, value: string, rules: Record<string, unknown>): boolean {
    const row = edits[catId] ?? {}
    if (row[`housing_${value}`] !== undefined) {
      return row[`housing_${value}`] === '1'
    }
    const statuses = rules.housing_statuses as string[] | undefined

    return Array.isArray(statuses) && statuses.includes(value)
  }

  async function onSave(e: FormEvent, catId: number) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const row = edits[catId] ?? {}
    const rulesList = categories.find((c) => Number(c.id) === catId)?.rules as Record<string, unknown>[] | Record<string, unknown> | undefined
    const rules = (Array.isArray(rulesList) ? rulesList[0] : rulesList) ?? {}
    try {
      const housingStatuses = HOUSING_OPTIONS
        .filter((opt) => housingChecked(catId, opt.value, rules as Record<string, unknown>))
        .map((opt) => opt.value)

      await api.upsertCategoryRule(catId, {
        max_monthly_income: row.max ? Number(row.max) : null,
        min_family_members: row.min ? Number(row.min) : null,
        requires_medical_case: row.req === '1' || row.req === 'true',
        requires_health_condition: row.health === '1' || row.health === 'true',
        min_newborns: row.newborns ? Number(row.newborns) : null,
        housing_statuses: housingStatuses.length > 0 ? housingStatuses : null,
        min_children_under_18: row.childrenUnder18 ? Number(row.childrenUnder18) : null,
        min_adults: row.adults ? Number(row.adults) : null,
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
          const rulesList = c.rules as Record<string, unknown>[] | Record<string, unknown> | undefined
          const rules = (Array.isArray(rulesList) ? rulesList[0] : rulesList) ?? {}
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
                  requires_health_condition — يشمل الحالة الصحية (1/0)
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'health', rules.requires_health_condition ? '1' : '0')}
                    onChange={(e) => setField(id, 'health', e.target.value)}
                  />
                </label>
                <label className="text-white/70">
                  min_newborns — حد أدنى للمواليد الجدد
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'newborns', String(rules.min_newborns ?? ''))}
                    onChange={(e) => setField(id, 'newborns', e.target.value)}
                  />
                </label>
                <label className="text-white/70">
                  min_children_under_18 — حد أدنى أطفال تحت 18
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'childrenUnder18', String(rules.min_children_under_18 ?? ''))}
                    onChange={(e) => setField(id, 'childrenUnder18', e.target.value)}
                  />
                </label>
                <label className="text-white/70">
                  min_adults — حد أدنى بالغين (18+)
                  <input
                    className="mt-1 w-full rounded border border-white/15 bg-slate-950/50 px-2 py-1 text-white"
                    value={field(id, 'adults', String(rules.min_adults ?? ''))}
                    onChange={(e) => setField(id, 'adults', e.target.value)}
                  />
                </label>
                <div className="sm:col-span-2">
                  <p className="text-white/70">housing_statuses — حالات السكن المعطاة أولوية</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {HOUSING_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-white/85">
                        <input
                          type="checkbox"
                          checked={housingChecked(id, opt.value, rules as Record<string, unknown>)}
                          onChange={(e) => setField(id, `housing_${opt.value}`, e.target.checked ? '1' : '0')}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
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
