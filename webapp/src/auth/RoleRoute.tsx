import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { roleAppPath } from './roleRoutes'
import type { UserRole } from '../types/models'

export function RoleRoute({
  allow,
  children,
}: {
  allow: UserRole[]
  children: React.ReactNode
}) {
  const { user } = useAuth()
  if (!user) {
    return null
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={roleAppPath(user.role)} replace />
  }
  return children
}
