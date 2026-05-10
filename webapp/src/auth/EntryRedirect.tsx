import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { roleAppPath } from './roleRoutes'

/** نقطة الدخول: يوجّه الزائر إلى تسجيل الدخول، والمستخدم المسجّل إلى مساحة دوره. */
export function EntryRedirect() {
  const { user, token, bootstrapping } = useAuth()

  if (bootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
      </div>
    )
  }

  if (token && user) {
    return <Navigate to={roleAppPath(user.role)} replace />
  }

  return <Navigate to="/login" replace />
}
