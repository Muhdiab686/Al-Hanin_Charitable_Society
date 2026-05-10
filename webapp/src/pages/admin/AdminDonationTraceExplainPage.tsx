import { Link } from 'react-router-dom'

/** شرح مسار التبرع من التسجيل حتى استفادة المستفيد. */
export function AdminDonationTraceExplainPage() {
  return (
    <div className="space-y-6 text-sm text-white/80">
      <h2 className="text-xl font-bold text-white">تتبّع التبرعات من المصدر إلى المستفيد</h2>
      <ol className="list-inside list-decimal space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <li>تسجيل التبرع وإنشاء الإيصال في وحدة القبض.</li>
        <li>
          تحوّل التبرعات النقدية إلى حركة مالية؛ والعينية إلى بنود مخزون قابلة للتدقيق.
        </li>
        <li>اعتماد طلب مساعدة يحدد الفئة المناسبة ويمنح صفة «جاهز للصرف».</li>
        <li>
          أمين المستودع يطابق البنود ويحرّك الكميات ويؤكّد عمليات التسليم المرتبطة بنفس الطلب.
        </li>
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-xl bg-white/15 px-4 py-2 text-white hover:bg-white/20" to="/app/admin/operations/donations">
          سجلّ التبرعات
        </Link>
        <Link className="rounded-xl bg-white/15 px-4 py-2 text-white hover:bg-white/20" to="/app/admin/operations/inventory">
          المخزون
        </Link>
        <Link className="rounded-xl bg-white/15 px-4 py-2 text-white hover:bg-white/20" to="/app/admin/operations/aid-requests">
          طلبات الدعم
        </Link>
      </div>
    </div>
  )
}
