/** Human-readable Arabic labels for operational / API codes (secretary, storekeeper, volunteer UIs). */

const AID_TYPE_AR: Record<string, string> = {
  urgent_financial: 'دعم معيشي عاجل',
  special_item: 'مواد أو عينية خاصة',
  medical_prescription: 'وصفة طبيّة / صرف دوائي',
}

const AID_STATUS_AR: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
  fulfilled: 'مُنجز بالكامل',
  delivered: 'بعد التسليم',
}

const PLAN_STATUS_AR: Record<string, string> = {
  draft: 'مسودة',
  approved: 'معتمدة',
  published: 'منشورة',
  closed: 'مغلقة',
  cancelled: 'ملغاة',
}

const INVENTORY_STATUS_AR: Record<string, string> = {
  stored: 'في المخزن',
  distributed: 'مُوزَّع',
  disposed: 'مُستبعد',
}

const REMOVAL_REASON_AR: Record<string, string> = {
  expired: 'منتهي الصلاحية',
  damaged: 'تالف',
  lost: 'مفقود',
  other: 'أخرى',
}

function fallback(code: string): string {
  return code.replace(/_/g, ' ')
}

export function labelAidTypeAr(code: unknown): string {
  const k = String(code ?? '').trim()

  return AID_TYPE_AR[k] ?? (k ? fallback(k) : '—')
}

export function labelAidStatusAr(code: unknown): string {
  const k = String(code ?? '').trim()

  return AID_STATUS_AR[k] ?? (k ? fallback(k) : '—')
}

export function badgeClassForAidStatus(code: unknown): string {
  const k = String(code ?? '')

  if (k === 'approved') {
    return 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/35'
  }
  if (k === 'rejected') {
    return 'bg-rose-500/20 text-rose-100 ring-rose-400/35'
  }
  if (k === 'pending') {
    return 'bg-amber-500/20 text-amber-100 ring-amber-400/35'
  }

  return 'bg-white/10 text-white/80 ring-white/15'
}

export function labelPlanStatusAr(code: unknown): string {
  const k = String(code ?? '').trim()

  return PLAN_STATUS_AR[k] ?? (k ? fallback(k) : '—')
}

export function labelInventoryStatusAr(code: unknown): string {
  const k = String(code ?? '').trim()

  return INVENTORY_STATUS_AR[k] ?? (k ? fallback(k) : '—')
}

export function labelRemovalReasonAr(code: unknown): string {
  const k = String(code ?? '').trim()

  return REMOVAL_REASON_AR[k] ?? (k ? fallback(k) : '—')
}
