import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean
  busyLabel?: string
  children: ReactNode
}

/** زر إرسال يُعطَّل أثناء الطلب ويعرض نص انتظار. */
export function SubmitButton({
  busy = false,
  busyLabel = 'جاري الإرسال...',
  children,
  className = '',
  disabled,
  type = 'submit',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`${className} ${busy ? 'cursor-wait opacity-70' : ''}`.trim()}
      {...rest}
    >
      {busy ? busyLabel : children}
    </button>
  )
}
