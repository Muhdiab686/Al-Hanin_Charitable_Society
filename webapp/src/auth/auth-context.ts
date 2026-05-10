import { createContext } from 'react'
import type { ApiUser } from '../types/models'

export type AuthContextValue = {
  user: ApiUser | null
  token: string | null
  bootstrapping: boolean
  login: (email: string, password: string) => Promise<ApiUser>
  register: (payload: {
    name: string
    email: string
    password: string
    password_confirmation: string
    role?: 'beneficiary' | 'donor'
  }) => Promise<ApiUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
