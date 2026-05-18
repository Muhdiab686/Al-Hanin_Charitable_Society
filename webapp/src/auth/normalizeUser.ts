import type { ApiUser, UserRole } from '../types/models'

const KNOWN_ROLES: UserRole[] = [
  'admin',
  'secretary',
  'recording_secretary',
  'accountant',
  'doctor',
  'storekeeper',
  'volunteer',
  'beneficiary',
  'donor',
]

function parseRole(raw: unknown, rolesArray?: unknown): UserRole {
  if (typeof raw === 'string' && KNOWN_ROLES.includes(raw as UserRole)) {
    return raw as UserRole
  }

  if (raw && typeof raw === 'object' && 'value' in raw) {
    const value = String((raw as { value: unknown }).value)
    if (KNOWN_ROLES.includes(value as UserRole)) {
      return value as UserRole
    }
  }

  if (Array.isArray(rolesArray) && rolesArray.length > 0) {
    const first = String(rolesArray[0])
    if (KNOWN_ROLES.includes(first as UserRole)) {
      return first as UserRole
    }
  }

  return 'donor'
}

export function normalizeApiUser(raw: Record<string, unknown>): ApiUser {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role: parseRole(raw.role, raw.roles),
  }
}
