import { useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { DonorChatMessageDto } from '../../api/services'
import { DonorChatThread } from '../../components/donor-chat/DonorChatThread'

type RecipientRole = 'accountant' | 'recording_secretary'

export function DonorChatPage() {
  const [recipientRole, setRecipientRole] = useState<RecipientRole>('recording_secretary')
  const [messages, setMessages] = useState<DonorChatMessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const copy = useMemo(() => {
    if (recipientRole === 'accountant') {
      return {
        title: 'محادثة مع المحاسب',
        subtitle: 'استفسارات مالية وتبرعات — لا يراها سوى المحاسب.',
      }
    }
    return {
      title: 'محادثة مع أمين السر',
      subtitle: 'استفسارات عامة ومتابعة التبرعات — لا يراها سوى أمين السر.',
    }
  }, [recipientRole])

  const reload = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const m = await api.fetchMyDonorChatMessages(recipientRole)
      setMessages(m)
    } catch (e) {
      setError(extractErrorMessage(e, 'تعذّر تحميل المحادثة'))
    } finally {
      setLoading(false)
    }
  }, [recipientRole])

  useEffect(() => {
    void reload()
    const id = window.setInterval(() => void reload(), 16_000)
    return () => window.clearInterval(id)
  }, [reload])

  async function onSend(text: string): Promise<void> {
    await api.postMyDonorChatMessage(text, recipientRole)
    await reload()
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-white">{copy.title}</h2>
        <p className="mt-2 max-w-prose text-sm text-white/60">{copy.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRecipientRole('recording_secretary')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${recipientRole === 'recording_secretary' ? 'bg-rose-700 text-white' : 'bg-white/10 text-white/75 hover:bg-white/15'}`}
          >
            أمين السر
          </button>
          <button
            type="button"
            onClick={() => setRecipientRole('accountant')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${recipientRole === 'accountant' ? 'bg-rose-700 text-white' : 'bg-white/10 text-white/75 hover:bg-white/15'}`}
          >
            المحاسب
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
        <DonorChatThread
          localeUi="ar"
          messages={messages}
          loading={loading}
          error={error}
          emptyHint="لا رسائل بعد في هذه المحادثة."
          inputPlaceholder="اكتب رسالتك…"
          sendLabel="إرسال"
          onSend={onSend}
        />
      </section>
    </div>
  )
}
