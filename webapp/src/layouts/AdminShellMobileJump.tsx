import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminSidebarNav } from '../admin/adminNavigation'
import { useI18n } from '../i18n/useI18n'

export function AdminShellMobileJump({ placeholder }: { placeholder: string }) {
  const navigate = useNavigate()
  const { locale } = useI18n()

  const options = useMemo(() => getAdminSidebarNav(locale).flatMap((g) => g.links), [locale])

  return (
    <label className="flex min-w-0 flex-1 items-center gap-2">
      <span className="sr-only">{placeholder}</span>
      <select
        className="min-w-0 w-full rounded-xl border border-indigo-500/25 bg-slate-950/80 px-3 py-2 text-[11px] text-white shadow-inner outline-none backdrop-blur focus:border-indigo-400/45 focus:ring-1 focus:ring-indigo-400/35"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value
          if (v) {
            navigate(v)
          }
          e.target.value = ''
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((link) => (
          <option key={link.to} value={link.to}>
            {link.label}
          </option>
        ))}
      </select>
    </label>
  )
}
