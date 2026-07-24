/** منطقة عمل الجمعية — سوريا (UTC+3، بدون توقيت صيفي حالياً). */
export const APP_TIME_ZONE = 'Asia/Damascus'
export const APP_UTC_OFFSET = '+03:00'

/**
 * قيمة لحقل `datetime-local` من تاريخ/سلسلة ISO، بتوقيت دمشق.
 */
export function toDateTimeLocalValue(input?: string | Date | null, offsetMs = 0): string {
  const base = input == null || input === '' ? new Date() : new Date(input)
  if (Number.isNaN(base.getTime())) {
    return ''
  }
  const d = new Date(base.getTime() + offsetMs)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/**
 * تحويل قيمة `datetime-local` (وقت الجدار في دمشق) إلى ISO للـ API.
 * يمنع فرق الساعات الناتج عن تفسير المتصفح كـ UTC عند العرض.
 */
export function dateTimeLocalToIso(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return new Date().toISOString()
  }
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed).toISOString()
  }
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? `${trimmed}:00` : trimmed
  return new Date(`${withSeconds}${APP_UTC_OFFSET}`).toISOString()
}

/** عرض تاريخ ووقت أنظف بالعربية (توقيت دمشق). */
export function formatDateTimeAr(input?: string | Date | null): string {
  if (input == null || input === '') {
    return '—'
  }
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    return String(input)
  }
  return new Intl.DateTimeFormat('ar-SY', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/** عرض تاريخ فقط (بدون وقت). */
export function formatDateAr(input?: string | Date | null): string {
  if (input == null || input === '') {
    return '—'
  }
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    return String(input)
  }
  return new Intl.DateTimeFormat('ar-SY', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/** للقيم الافتراضية: الآن + إزاحة بالدقائق، بصيغة datetime-local. */
export function nowDateTimeLocal(offsetMinutes = 0): string {
  return toDateTimeLocalValue(new Date(), offsetMinutes * 60_000)
}

/** مساعدة اختبارات/عرض مختصر HH:mm. */
export function formatTimeAr(input?: string | Date | null): string {
  if (input == null || input === '') {
    return '—'
  }
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    return String(input)
  }
  return new Intl.DateTimeFormat('ar-SY', {
    timeZone: APP_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function formatDateTimeParts(input?: string | Date | null): { date: string; time: string } {
  return {
    date: formatDateAr(input),
    time: formatTimeAr(input),
  }
}
