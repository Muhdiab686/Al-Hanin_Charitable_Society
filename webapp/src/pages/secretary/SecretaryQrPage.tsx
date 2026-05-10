import { type FormEvent, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'

export function SecretaryQrPage() {
  const [payload, setPayload] = useState('hanin:00000000-0000-0000-0000-000000000000')
  const [out, setOut] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setOut(null)
    try {
      const r = await api.postQrVerify({ payload })
      setOut(JSON.stringify(r, null, 2))
    } catch (ex) {
      setErr(extractErrorMessage(ex, 'فشل التحقق'))
    }
  }

  return (
    <div className="space-y-6 text-sm">
      {err ? <div className="rounded-xl bg-red-500/15 px-4 py-3 text-red-100">{err}</div> : null}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">التحقق من QR (payload)</h2>
        <p className="mt-2 text-xs text-white/60">صيغة: hanin:uuid</p>
        <form className="mt-3 space-y-3" onSubmit={onVerify}>
          <textarea
            className="w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 font-mono text-xs text-white"
            rows={3}
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 font-medium">
            تحقق
          </button>
        </form>
        {out ? (
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-emerald-100">{out}</pre>
        ) : null}
      </section>
    </div>
  )
}
