import { Link } from 'react-router-dom'

export function ShortcutGrid({
  items,
  heading,
  accentClass = 'text-indigo-100',
}: {
  heading?: string
  accentClass?: string
  items: { to: string; title: string; desc: string }[]
}) {
  return (
    <div className="space-y-4">
      {heading ? <h2 className="text-sm font-semibold text-white/90">{heading}</h2> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
          >
            <h3 className={`text-lg font-semibold ${accentClass}`}>{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
