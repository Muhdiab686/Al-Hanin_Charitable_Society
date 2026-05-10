import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { extractErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { roleAppPath } from '../../auth/roleRoutes'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [role, setRole] = useState<'beneficiary' | 'donor'>('beneficiary')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const user = await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        role,
      })
      navigate(roleAppPath(user.role), { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذّر إنشاء الحساب'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-950 via-sky-950 to-slate-900 px-4 py-12 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-center text-2xl font-bold text-white">إنشاء حساب</h1>
        <p className="mt-2 text-center text-sm text-white/65">
          يقتصر التسجيل الذاتي على المستفيد أو المتبرع حسب إعدادات الخادم
        </p>
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          {error ? (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-white/80">
              الاسم الكامل
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-white/80">نوع الحساب</span>
            <div className="flex gap-3">
              {(
                [
                  { v: 'beneficiary' as const, label: 'مستفيد' },
                  { v: 'donor' as const, label: 'متبرع' },
                ]
              ).map((o) => (
                <label
                  key={o.v}
                  className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    role === o.v
                      ? 'border-sky-400/60 bg-sky-500/20 text-white'
                      : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={o.v}
                    checked={role === o.v}
                    onChange={() => setRole(o.v)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
          <div>
            <label htmlFor="pc" className="mb-1.5 block text-sm font-medium text-white/80">
              تأكيد كلمة المرور
            </label>
            <input
              id="pc"
              type="password"
              required
              value={passwordConfirmation}
              onChange={(ev) => setPasswordConfirmation(ev.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-sky-400 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-60"
          >
            {pending ? 'جاري الإنشاء…' : 'تسجيل'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/60">
          لديك حساب؟{' '}
          <Link to="/login" className="font-semibold text-sky-300 hover:text-sky-200">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
