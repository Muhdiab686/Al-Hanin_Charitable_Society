import { Link } from 'react-router-dom'

/** خطط وحملات: مساحة تمهيد لتشغيل أهداف الحملات والمتابعة. */
export function AdminCampaignMissionControlPage() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-white/80">
      <h2 className="text-xl font-bold text-white">الحملات الخيرية — التخطيط والمتابعة</h2>
      <ul className="list-inside list-disc space-y-2 text-white/70">
        <li>تهيئة حملة بدعوى واضحة، مبالغ مستهدفة، وفترات زمنية تحفّز المتبرعين.</li>
        <li>متابعة مؤشر الإنجاز (نسب التحصيل، عدد المستفيدين المرتبطين بالحملة، حالة الموافقة).</li>
        <li>إنهاء أو تعليق الحملة آلياً عند بلوغ المبلغ أو انتهاء الوقت وفق سياسة الجمعية.</li>
      </ul>
      <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-50">
        جارٍ ربط خدمة الحملات بالطبقة الآلية لتخزين الأهداف وربط الإيصالات — يمكنكم حالياً تتبع التبرعات من{' '}
        <Link className="text-white underline underline-offset-2" to="/app/admin/operations/donations">
          وحدة التبرعات
        </Link>{' '}
        وخطط الدعم من{' '}
        <Link className="text-white underline underline-offset-2" to="/app/admin/operations/aid-plans">
          خطط التوزيع
        </Link>
        .
      </p>
    </div>
  )
}
