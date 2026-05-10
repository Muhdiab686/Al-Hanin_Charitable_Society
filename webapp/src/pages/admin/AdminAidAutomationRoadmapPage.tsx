import { Link } from 'react-router-dom'

/** سياسات اقتراح التوزيع المساعِد وباقي المراحل التقنية. */
export function AdminAidAutomationRoadmapPage() {
  return (
    <div className="space-y-4 text-sm text-white/80">
      <h2 className="text-xl font-bold text-white">محرّكات اقتراح التوزيع</h2>
      <p>
        يمكن لاحقاً دمج خوارزميات تراعي وزن كل فئة، والمخزون المتاح، ومواعيد الاستحقاق لاقتراح دفعات مسبقة يُصدِق عليها المسؤول البشري.
      </p>
      <Link className="inline-block rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15" to="/app/admin/policies/priorities">
        رابط بسياسات الأولويات
      </Link>
    </div>
  )
}
