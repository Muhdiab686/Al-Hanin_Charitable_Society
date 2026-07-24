import { useCallback, useRef, useState } from 'react'

/**
 * يمنع الإرسال المزدوج عند الضغط السريع مرتين:
 * - قفل فوري عبر ref (قبل إعادة رسم React)
 * - تعطيل الزر أثناء الطلب
 * - فترة تهدئة قصيرة بعد انتهاء الطلب
 */
export function useSubmitLock(cooldownMs = 700) {
  const lockedRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      if (lockedRef.current) {
        return undefined
      }

      lockedRef.current = true
      setBusy(true)

      try {
        return await action()
      } finally {
        window.setTimeout(() => {
          lockedRef.current = false
          setBusy(false)
        }, cooldownMs)
      }
    },
    [cooldownMs],
  )

  return { busy, run }
}
