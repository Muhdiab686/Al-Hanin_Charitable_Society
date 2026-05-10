import { useCallback, useEffect, useMemo, useState } from 'react'
import { extractErrorMessage } from '../../api/client'
import * as api from '../../api/services'
import type { DonorChatDonorRowDto, DonorChatMessageDto } from '../../api/services'
import { DonorChatThread } from '../../components/donor-chat/DonorChatThread'
import { useI18n } from '../../i18n/useI18n'

export function AdminDonorChatPage() {
  const { locale } = useI18n()
  const localeUi = locale === 'en' ? 'en' : 'ar'

  const copy = useMemo(
    () =>
      localeUi === 'en'
        ? {
            title: 'Donor chat',
            intro: 'Message registered donors securely. Threads are retained for audit.',
            selectDonor: 'Select a donor',
            countSuffix: 'messages',
            pickHint: 'Choose a donor account to load the conversation.',
            empty: 'No messages yet.',
            placeholder: 'Type a message…',
            send: 'Send',
            refreshList: 'Refresh list',
          }
        : {
            title: 'محادثة المتبرعين',
            intro: 'مراسبة المتبرعين المسجّلين في المنصّة بشكل مركزي (تُخزَّن المحادثات للمتابعة).',
            selectDonor: 'اختر المتبرع',
            countSuffix: 'رسالة',
            pickHint: 'اختر حساب المتبرع لعرض المحادثة الخاصّة به.',
            empty: 'لا رسائل بعد — ابدأ التواصل بوضوح واحترام.',
            placeholder: 'اكتب رسالتك إلى المتبرع…',
            send: 'إرسال',
            refreshList: 'تحديث القائمة',
          },
    [localeUi],
  )

  const [donors, setDonors] = useState<DonorChatDonorRowDto[]>([])
  const [donorsLoading, setDonorsLoading] = useState(true)
  const [donorsError, setDonorsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<DonorChatMessageDto[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)

  const loadDonors = useCallback(async () => {
    setDonorsError(null)
    setDonorsLoading(true)
    try {
      const d = await api.fetchDonorChatDonors()
      setDonors(d)
    } catch (e) {
      setDonorsError(extractErrorMessage(e, localeUi === 'en' ? 'Could not load donors' : 'تعذّر تحميل قائمة المتبرعين'))
    } finally {
      setDonorsLoading(false)
    }
  }, [localeUi])

  const loadThread = useCallback(
    async (donorId: number) => {
      setThreadError(null)
      setThreadLoading(true)
      try {
        const m = await api.fetchDonorChatThread(donorId)
        setMessages(m)
      } catch (e) {
        setThreadError(extractErrorMessage(e, localeUi === 'en' ? 'Could not load messages' : 'تعذّر تحميل الرسائل'))
      } finally {
        setThreadLoading(false)
      }
    },
    [localeUi],
  )

  useEffect(() => {
    void loadDonors()
  }, [loadDonors])

  useEffect(() => {
    if (selectedId === null && donors.length > 0) {
      const firstId = donors[0]?.id
      if (typeof firstId === 'number') {
        setSelectedId(firstId)
      }
    }
  }, [donors, selectedId])

  useEffect(() => {
    if (selectedId === null) {
      return undefined
    }
    void loadThread(selectedId)

    const t = window.setInterval(() => void loadThread(selectedId), 16_000)
    return () => window.clearInterval(t)
  }, [selectedId, loadThread])

  const selectedDonor = useMemo(() => donors.find((d) => d.id === selectedId), [donors, selectedId])

  async function onSend(text: string) {
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
        <h2 className="text-xl font-bold text-white">{copy.title}</h2>
        <p className="mt-1 max-w-prose text-sm text-white/60">{copy.intro}</p>
      </header>

      <div className="grid min-h-[28rem] gap-6 lg:grid-cols-[minmax(220px,17rem)_1fr]">
        <aside className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{copy.selectDonor}</p>
            <button
              type="button"
              className="text-[11px] font-medium text-indigo-200 underline-offset-4 hover:text-white hover:underline"
              onClick={() => void loadDonors()}
            >
              {copy.refreshList}
            </button>
          </div>

          {donorsError ? <p className="text-xs text-amber-200/95">{donorsError}</p> : null}

          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {donorsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
              </div>
            ) : donors.length === 0 ? (
              <p className="text-xs text-white/45">{localeUi === 'en' ? 'No donor accounts.' : 'لا حسابات متبرعين.'}</p>
            ) : (
              donors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`rounded-xl border px-3 py-2.5 text-start text-[13px] transition ${
                    selectedId === d.id
                      ? 'border-indigo-400/40 bg-indigo-500/15 text-white shadow-inner'
                      : 'border-transparent bg-black/25 text-white/75 hover:border-white/12 hover:bg-white/[0.07]'
                  }`}
                >
                  <span className="font-semibold text-white">{d.name}</span>
                  <span className="mt-1 block truncate text-[11px] text-white/48">{d.email}</span>
                  <span className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                    {d.messages_count} {copy.countSuffix}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[24rem] flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-black/55 to-white/[0.03] p-4">
          {selectedDonor ? (
            <div className="mb-4 border-b border-white/[0.08] pb-3">
              <h3 className="text-lg font-semibold text-white">{selectedDonor.name}</h3>
              <p className="text-[12px] text-white/52">{selectedDonor.email}</p>
            </div>
          ) : (
            <p className="mb-4 text-sm text-white/52">{copy.pickHint}</p>
          )}

          {selectedId === null ? null : (
            <DonorChatThread
              localeUi={localeUi}
              messages={messages}
              loading={threadLoading}
              error={threadError}
              emptyHint={copy.empty}
              inputPlaceholder={copy.placeholder}
              sendLabel={copy.send}
              onSend={onSend}
            />
          )}
        </section>
      </div>
    </div>
  )
}
