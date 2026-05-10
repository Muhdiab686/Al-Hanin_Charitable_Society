import type { AppLocale } from '../i18n/locale'
import type { UserRole } from '../types/models'

export function roleAppPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/app/admin'
    case 'secretary':
      return '/app/secretary'
    case 'accountant':
      return '/app/accountant'
    case 'doctor':
      return '/app/doctor'
    case 'storekeeper':
      return '/app/storekeeper'
    case 'donor':
      return '/app/donor'
    case 'volunteer':
      return '/app/volunteer'
    case 'beneficiary':
      return '/app/beneficiary'
    default:
      return '/app/donor'
  }
}

export function roleLabelAr(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'مدير النظام',
    secretary: 'سكرتير',
    accountant: 'محاسب',
    doctor: 'طبيب',
    storekeeper: 'أمين مستودع',
    volunteer: 'متطوع',
    beneficiary: 'مستفيد',
    donor: 'متبرع',
  }
  return labels[role] ?? role
}

const labelsEn: Record<UserRole, string> = {
  admin: 'Administrator',
  secretary: 'Secretary',
  accountant: 'Accountant',
  doctor: 'Doctor',
  storekeeper: 'Storekeeper',
  volunteer: 'Volunteer',
  beneficiary: 'Beneficiary',
  donor: 'Donor',
}

export function roleLabel(role: UserRole, locale: AppLocale): string {
  return locale === 'en' ? (labelsEn[role] ?? role) : roleLabelAr(role)
}
