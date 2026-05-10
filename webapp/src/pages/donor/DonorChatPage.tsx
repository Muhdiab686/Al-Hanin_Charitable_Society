import { useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { DonorChatMessageDto } from '../../api/services'
import { DonorChatThread } from '../../components/donor-chat/DonorChatThread'

export function DonorChatPage() {
  const copy = useMemo(
    () => ({
      title: 'محادثة مع الإدارة',
      subtitle: 'راسِل الفريق لمتابعة تبرعاتك أو أي استفسار — ستظهر رسائلك هنا فقط ضمن هذا الحساب.',
      empty: 'لا رسائل بعد. يمكن أن تتلقّى تحديثات من الإداريين هنا.',
      placeholder: 'اكتب رسالتك…',
      send: 'إرسال إلى الإدارة',
    }),
    [],
  )

  const [messages, setMessages] = useState<DonorChatMessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const m = await api.fetchMyDonorChatMessages()
      setMessages(m)
    } catch (e) {
      setError(extractErrorMessage(e, 'تعذّر تحميل المحادثة'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
    const id = window.setInterval(() => void reload(), 16_000)
    return () => window.clearInterval(id)
  }, [reload])

  async function onSend(text: string): Promise<void> {
    await api.postMyDonorChatMessage(text)
    await reload()
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-white">{copy.title}</h2>
        <p className="mt-2 max-w-prose text-sm text-white/60">{copy.subtitle}</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
        <DonorChatThread
          localeUi="ar"
          messages={messages}
          loading={loading}
          error={error}
          emptyHint={copy.empty}
          inputPlaceholder={copy.placeholder}
          sendLabel={copy.send}
          onSend={onSend}
        />
      </section>
    </div>
  )
}
