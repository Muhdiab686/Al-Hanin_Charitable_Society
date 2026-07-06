/** Shared medical specialty options — must match app/Enums/MedicalSpecialty.php */
export const MEDICAL_SPECIALTIES = [
  { value: 'طب عام', label: 'طب عام' },
  { value: 'أطفال', label: 'أطفال' },
  { value: 'نسائية', label: 'نسائية' },
  { value: 'عظام', label: 'عظام' },
  { value: 'قلب', label: 'قلب' },
] as const

export const WEEKDAY_OPTIONS = [
  { value: 'Saturday', label: 'السبت' },
  { value: 'Sunday', label: 'الأحد' },
  { value: 'Monday', label: 'الاثنين' },
  { value: 'Tuesday', label: 'الثلاثاء' },
  { value: 'Wednesday', label: 'الأربعاء' },
  { value: 'Thursday', label: 'الخميس' },
  { value: 'Friday', label: 'الجمعة' },
] as const

export function weekdayLabelEn(day: string): string {
  return WEEKDAY_OPTIONS.find((opt) => opt.value === day)?.label ?? day
}

/** Next dates (up to `limit`) that fall on the doctor's available English weekday names. */
export function upcomingAvailableDates(
  availableDays: string[],
  limit = 16,
): { value: string; label: string }[] {
  if (availableDays.length === 0) {
    return []
  }

  const results: { value: string; label: string }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = 0; offset < 90 && results.length < limit; offset++) {
    const candidate = new Date(today)
    candidate.setDate(today.getDate() + offset)
    const englishDay = candidate.toLocaleDateString('en-US', { weekday: 'long' })

    if (!availableDays.includes(englishDay)) {
      continue
    }

    const value = candidate.toISOString().slice(0, 10)
    const label = candidate.toLocaleDateString('ar-SY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    results.push({ value, label })
  }

  return results
}
