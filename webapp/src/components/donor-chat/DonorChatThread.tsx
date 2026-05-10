import { useEffect, useMemo, useRef, useState } from 'react'
import type { DonorChatMessageDto } from '../../api/services'

export type DonorChatThreadProps = {
  messages: DonorChatMessageDto[]
  loading: boolean
  error: string | null
  emptyHint: string
  inputPlaceholder: string
  sendLabel: string
  /** Bubble alignment: donor messages use one side regardless of viewer. */
  donorBubbleClass?: string
  staffBubbleClass?: string
  onSend: (text: string) => Promise<void>
  localeUi: 'ar' | 'en'
}

function formatChatTime(iso: string | null, localeUi: 'ar' | 'en'): string {
  if (!iso) {
    return ''
  }
  const d = new Date(iso)

  try {
    return new Intl.DateTimeFormat(localeUi === 'en' ? 'en-GB' : 'ar-SA', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return iso
  }
}

export function DonorChatThread({
  messages,
  loading,
  error,
  emptyHint,
  inputPlaceholder,
  sendLabel,
  donorBubbleClass = 'ms-auto rounded-2xl rounded-br-md border border-rose-400/30 bg-rose-500/20 text-rose-50',
  staffBubbleClass = 'me-auto rounded-2xl rounded-bl-md border border-indigo-400/30 bg-indigo-500/20 text-indigo-50',
  onSend,
  localeUi,
}: DonorChatThreadProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const canSend = useMemo(() => draft.trim().length > 0 && !sending && !loading, [draft, sending, loading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function submit() {
    const text = draft.trim()
    if (!text || sending) {
      return
    }
    setSending(true)
    try {
      await onSend(text)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-[22rem] flex-1 flex-col gap-4">
      {error ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-2 text-sm text-amber-50">{error}</div>
      ) : null}

      <div className="custom-chat-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/35 p-3">
        {loading && messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-14">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-indigo-300" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/45">{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const fromDonor = m.is_from_donor
            const bubbleClass = fromDonor ? donorBubbleClass : staffBubbleClass
            const align = fromDonor ? 'items-end text-end' : 'items-start text-start'

            return (
              <div key={m.id} className={`flex w-full flex-col gap-1 ${align}`}>
                <div className={`max-w-[92%] px-4 py-2.5 text-sm leading-relaxed shadow-inner backdrop-blur ${bubbleClass}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <div className={`flex flex-wrap gap-2 px-1 text-[10px] text-white/40 ${align}`}>
                  <span>{fromDonor ? (localeUi === 'en' ? 'Donor' : 'متبرع') : localeUi === 'en' ? 'Team' : 'فريق الإدارة'}</span>
                  <span>·</span>
                  <time dateTime={m.created_at ?? undefined}>{formatChatTime(m.created_at, localeUi)}</time>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="sr-only">{inputPlaceholder}</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={inputPlaceholder}
          rows={3}
          className="resize-y rounded-2xl border border-white/12 bg-black/45 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-indigo-400/45 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-white/38">{localeUi === 'en' ? 'Ctrl/⌘ + Enter to send' : 'Ctrl/⌘ + Enter للإرسال'}</p>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => void submit()}
            className="rounded-xl bg-indigo-500/85 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          >
            {sending ? (localeUi === 'en' ? 'Sending…' : 'جارٍ الإرسال…') : sendLabel}
          </button>
        </div>
      </div>
      <style>{`
        .custom-chat-scroll::-webkit-scrollbar { width: 6px; }
        .custom-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(129, 140, 248, 0.35);
          border-radius: 9999px;
        }
      `}</style>
    </div>
  )
}
