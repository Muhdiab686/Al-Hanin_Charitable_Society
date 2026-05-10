import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { roleAppPath } from '../../auth/roleRoutes'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const user = await login(email, password)
      navigate(roleAppPath(user.role), { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذّر تسجيل الدخول'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-12 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-indigo-900/40 backdrop-blur-xl">
        <h1 className="text-center text-2xl font-bold text-white">تسجيل الدخول</h1>
        <p className="mt-2 text-center text-sm text-white/65">أدخل بيانات الحساب المرتبطة بجمعية الحنين</p>
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          {error ? (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none ring-teal-400/0 transition focus:border-teal-400/50 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/30"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-teal-400 py-3 text-base font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60"
          >
            {pending ? 'جاري الدخول…' : 'دخول'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/60">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="font-semibold text-teal-300 hover:text-teal-200">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  )
}
