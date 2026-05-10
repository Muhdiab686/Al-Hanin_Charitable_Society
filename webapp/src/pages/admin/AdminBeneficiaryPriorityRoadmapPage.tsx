import { Link } from 'react-router-dom'

/** سياسات ترتيب المستفيدين وضوابط الأولوية. */
export function AdminBeneficiaryPriorityRoadmapPage() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-white/80">
      <h2 className="text-xl font-bold text-white">سياسات أولويات المستفيدين</h2>
      <p>
        يعتمد الوضع الراهن على قواعد التصنيف والأهلية المخزَّنة؛ ويمكن توسيع المنصّة لاحقاً بتصنيف ديناميكي يمزج درجة الأولوية، والحالات الطارئة، والالتزام ببرامج المتابعة الطبية أو الاجتماعية.
      </p>
      <Link className="inline-block rounded-xl bg-violet-500/35 px-4 py-2 font-semibold text-white hover:bg-violet-500/45" to="/app/admin/program/categories">
        إدارة قواعد الفئات
      </Link>
    </div>
  )
}
