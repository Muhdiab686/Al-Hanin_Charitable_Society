import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { roleAppPath } from './roleRoutes'

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping, token } = useAuth()

  if (bootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    )
  }

  if (token && user) {
    return <Navigate to={roleAppPath(user.role)} replace />
  }

  return children
}
