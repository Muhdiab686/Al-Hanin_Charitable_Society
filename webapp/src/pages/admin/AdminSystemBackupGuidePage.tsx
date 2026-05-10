/** دليل تنفيذي للنسخ الاحتياطي على مستوى الخادم. */
export function AdminSystemBackupGuidePage() {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-white/82">
      <h2 className="text-xl font-bold text-white">النسخ الاحتياطي كل ٢٤ ساعة</h2>
      <p className="rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.08] px-4 py-3 text-indigo-100/92">
        لإنهاء الجلسة أو تبديل الحساب من لوحة الإدارة استخدم زر تسجيل الخروج في أسفل الشريط الجانبي أو شريط
        الوصول السريع على الجوال — خاصة بعد العمل من أجهزة مشتركة.
      </p>
      <ol className="list-inside list-decimal space-y-3 rounded-2xl border border-white/15 bg-black/35 p-5">
        <li>اعتمد مهمة مجدولة عبر Laravel Scheduler لتشغيل أمر ضغط القاعدة والملفات، ثم ضع الخرج خارج الخادم.</li>
        <li>اختبر استعادة نسخة تجريبيّة شهرياً لتفادي مفاجآت الترميز أو الأذونات.</li>
        <li>
          وحّد حقوق الوصول (أقل صلاحية لازمة) وحافظ على مفتاح تشفير آمن خارج Git.
        </li>
      </ol>
      <pre className="overflow-x-auto rounded-xl bg-black/60 p-4 text-xs leading-6 text-emerald-100/90">{`// routes/console.php (مثال)
Schedule::call(function (): void {
    // استدعاء أمر Laravel Backup أو سكربت مخصّص
})->daily();`}</pre>
    </div>
  )
}
