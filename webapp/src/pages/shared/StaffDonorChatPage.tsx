import { useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { DonorChatDonorRowDto, DonorChatMessageDto } from '../../api/services'
import { DonorChatThread } from '../../components/donor-chat/DonorChatThread'
import { useAuth } from '../../auth/useAuth'

export function StaffDonorChatPage() {
  const { user } = useAuth()
  const [donors, setDonors] = useState<DonorChatDonorRowDto[]>([])
  const [messages, setMessages] = useState<DonorChatMessageDto[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loadingDonors, setLoadingDonors] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headerTitle = useMemo(() => {
    if (user?.role === 'accountant') {
      return 'شات المتبرعين - المحاسب'
    }
    return 'شات المتبرعين - أمين السر'
  }, [user?.role])

  const roleHint = useMemo(() => (user?.role === 'accountant' ? 'accountant' : 'recording_secretary'), [user?.role])

  const loadDonors = useCallback(async () => {
    setLoadingDonors(true)
    setError(null)
    try {
      const data = await api.fetchDonorChatDonors()
      setDonors(data)
      if (selectedId === null && data.length > 0) {
        setSelectedId(data[0].id)
      }
    } catch (e) {
      setError(extractErrorMessage(e, 'تعذّر تحميل قائمة المتبرعين'))
    } finally {
      setLoadingDonors(false)
    }
  }, [selectedId])

  const loadThread = useCallback(async (donorId: number) => {
    setLoadingThread(true)
    setError(null)
    try {
      const data = await api.fetchDonorChatThread(donorId)
      setMessages(data)
    } catch (e) {
      setError(extractErrorMessage(e, 'تعذّر تحميل المحادثة'))
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    void loadDonors()
  }, [loadDonors])

  useEffect(() => {
    if (selectedId === null) {
      return
    }
    void loadThread(selectedId)
  }, [selectedId, loadThread])

  async function onSend(text: string): Promise<void> {
    if (selectedId === null) {
      return
    }
    await api.postAdminDonorChatMessage(selectedId, text)
    await loadThread(selectedId)
    void loadDonors()
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-white">{headerTitle}</h2>
        <p className="mt-1 text-sm text-white/60">
          تُعرض هنا محادثات المتبرعين الموجّهة إلى دورك فقط.
        </p>
      </header>

      {error ? (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-lg rounded-xl border border-red-400/35 bg-red-600/90 px-4 py-3 text-red-50 shadow-lg">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[26rem] gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-white/55">المتبرعون</p>
            <button
              type="button"
              onClick={() => void loadDonors()}
              className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white transition active:scale-[0.98] hover:bg-white/10"
            >
              تحديث
            </button>
          </div>
          <div className="space-y-1 overflow-y-auto">
            {loadingDonors ? (
              <p className="text-xs text-white/50">جاري التحميل...</p>
            ) : (
              donors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full rounded-lg px-3 py-2 text-start text-xs transition active:scale-[0.98] ${
                    selectedId === d.id ? 'bg-indigo-600/45 text-white' : 'bg-black/25 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold">{d.name}</p>
                  <p className="truncate text-[10px] opacity-80">{d.email}</p>
                  <p className="text-[10px] opacity-70">{d.messages_count} رسالة</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
          {selectedId === null ? (
            <p className="text-sm text-white/55">اختر متبرعًا من القائمة لبدء المحادثة.</p>
          ) : (
            <DonorChatThread
              localeUi="ar"
              messages={messages}
              loading={loadingThread}
              error={null}
              emptyHint={`لا رسائل بعد لهذا المتبرع (${roleHint}).`}
              inputPlaceholder="اكتب ردك..."
              sendLabel="إرسال"
              onSend={onSend}
            />
          )}
        </section>
      </div>
    </div>
  )
}
