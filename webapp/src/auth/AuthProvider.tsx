import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getStoredToken, setAuthToken } from '../api/client'
import * as api from '../api/services'
import type { ApiUser } from '../types/models'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [bootstrapping, setBootstrapping] = useState(true)

  const refreshUser = useCallback(async () => {
    const me = await api.fetchMe()
    setUser(me)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!token) {
        setBootstrapping(false)
        return
      }
      try {
        const me = await api.fetchMe()
        if (!cancelled) {
          setUser(me)
        }
      } catch {
        if (!cancelled) {
          setAuthToken(null)
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false)
        }
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({
      email,
      password,
      device_name: 'alhanin-webapp',
    })
    setAuthToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    async (payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
      role?: 'beneficiary' | 'donor'
    }) => {
      const data = await api.register(payload)
      setAuthToken(data.token)
      setToken(data.token)
      setUser(data.user)
      return data.user
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.logout()
      }
    } catch {
      /* token may already be invalid */
    } finally {
      setAuthToken(null)
      setToken(null)
      setUser(null)
    }
  }, [token])

  const value = useMemo(
    () => ({
      user,
      token,
      bootstrapping,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, bootstrapping, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
