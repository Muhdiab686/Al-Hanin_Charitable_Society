import axios, { type AxiosError } from 'axios'

const TOKEN_KEY = 'alhanin_api_token'

function resolvedBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.replace(/\/$/, '')
  }
  return ''
}

export const apiClient = axios.create({
  baseURL: resolvedBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export type LaravelValidationError = {
  message?: string
  errors?: Record<string, string[]>
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  const ax = err as AxiosError<LaravelValidationError>
  if (ax.response?.data?.message) {
    return ax.response.data.message
  }
  const errors = ax.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()[0]
    if (first) {
      return first
    }
  }
  if (ax.message) {
    return ax.message
  }
  return fallback
}
