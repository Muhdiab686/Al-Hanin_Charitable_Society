import type { AppLocale } from '../i18n/locale'
import type { AdminNavGroup } from './navTypes'

const ar: AdminNavGroup[] = [
  {
    title: 'لوحة القيادة',
    links: [{ to: '/app/admin', label: 'نظرة تنفيذية عامة' }],
  },
  {
    title: 'المستخدمون والصلاحيات',
    links: [
      { to: '/app/admin/access/users', label: 'إنشاء حسابات وإدارتها' },
      { to: '/app/admin/access/roles', label: 'الأدوار والصلاحيات' },
    ],
  },
  {
    title: 'التقارير والرقابة',
    links: [
      { to: '/app/admin/reports/statistics', label: 'تقارير إحصائية ومالية' },
      { to: '/app/admin/reports/specialized', label: 'مالية · طبية · مخزنية' },
    ],
  },
  {
    title: 'المستفيدون والتصنيف',
    links: [
      { to: '/app/admin/program/beneficiaries', label: 'المستفيدون وحالة السجل' },
      { to: '/app/admin/program/categories', label: 'قواعد تصنيف الأسر' },
    ],
  },
  {
    title: 'التبرعات والمخزون والأثر',
    links: [
      { to: '/app/admin/operations/inventory', label: 'جرد المستودع والمخزون' },
      { to: '/app/admin/operations/donations', label: 'التبرعات وإدارتها' },
      { to: '/app/admin/operations/aid-requests', label: 'طلبات المساعدة والموافقات' },
      { to: '/app/admin/operations/aid-plans', label: 'خطط التوزيع والإسناد' },
      { to: '/app/admin/operations/trace-donations', label: 'مسار التبرع حتى المستفيد' },
    ],
  },
  {
    title: 'التطوع والعيادة والمال اليومي',
    links: [
      { to: '/app/admin/people/volunteers', label: 'المتطوعون ومتابعة الأداء' },
      { to: '/app/admin/clinic/overview', label: 'العيادة والمسار الطبي' },
      { to: '/app/admin/finance/expenses', label: 'المصروفات والفواتير' },
      { to: '/app/admin/finance/payouts', label: 'صرف ومستحقات الأطباء' },
    ],
  },
  {
    title: 'الحملات الخيرية',
    links: [
      { to: '/app/admin/campaigns/dashboard', label: 'الأهداف والجدولة والمتابعة' },
      { to: '/app/admin/campaigns/reporting', label: 'لوحة تقارير الحملات' },
    ],
  },
  {
    title: 'سياسات ومساعدات ذكية',
    links: [
      { to: '/app/admin/policies/aid-suggestions', label: 'اقتراح توزيع المساعدات' },
      { to: '/app/admin/policies/priorities', label: 'أولويات المستفيدين والترتيب' },
      { to: '/app/admin/communications/notifications', label: 'محادثة المتبرعين' },
    ],
  },
  {
    title: 'النسخ والأرشفة',
    links: [{ to: '/app/admin/system/backup', label: 'دليل النسخ الاحتياطي والجدولة' }],
  },
]

const en: AdminNavGroup[] = [
  {
    title: 'Overview',
    links: [{ to: '/app/admin', label: 'Executive snapshot' }],
  },
  {
    title: 'Users & permissions',
    links: [
      { to: '/app/admin/access/users', label: 'User accounts' },
      { to: '/app/admin/access/roles', label: 'Roles & permissions' },
    ],
  },
  {
    title: 'Reports & oversight',
    links: [
      { to: '/app/admin/reports/statistics', label: 'Statistical & financial reports' },
      { to: '/app/admin/reports/specialized', label: 'Finance · Medical · Warehouse' },
    ],
  },
  {
    title: 'Beneficiaries & classification',
    links: [
      { to: '/app/admin/program/beneficiaries', label: 'Beneficiary records & status' },
      { to: '/app/admin/program/categories', label: 'Household category rules' },
    ],
  },
  {
    title: 'Donations, stock & impact',
    links: [
      { to: '/app/admin/operations/inventory', label: 'Warehouse stock & audit' },
      { to: '/app/admin/operations/donations', label: 'Donations management' },
      { to: '/app/admin/operations/aid-requests', label: 'Aid requests & approvals' },
      { to: '/app/admin/operations/aid-plans', label: 'Distribution plans' },
      { to: '/app/admin/operations/trace-donations', label: 'Donation journey to beneficiary' },
    ],
  },
  {
    title: 'Volunteering, clinic & daily finance',
    links: [
      { to: '/app/admin/people/volunteers', label: 'Volunteers & performance' },
      { to: '/app/admin/clinic/overview', label: 'Clinic & medical flow' },
      { to: '/app/admin/finance/expenses', label: 'Expenses & invoices' },
      { to: '/app/admin/finance/payouts', label: 'Doctor payouts' },
    ],
  },
  {
    title: 'Charity campaigns',
    links: [
      { to: '/app/admin/campaigns/dashboard', label: 'Goals, schedule & progress' },
      { to: '/app/admin/campaigns/reporting', label: 'Campaign reporting' },
    ],
  },
  {
    title: 'Policies & smart aid',
    links: [
      { to: '/app/admin/policies/aid-suggestions', label: 'Aid distribution suggestions' },
      { to: '/app/admin/policies/priorities', label: 'Beneficiary priorities' },
      { to: '/app/admin/communications/notifications', label: 'Donor chat' },
    ],
  },
  {
    title: 'Backups & archival',
    links: [{ to: '/app/admin/system/backup', label: 'Backup runbook & scheduling' }],
  },
]

export function getAdminNavForLocale(locale: AppLocale): AdminNavGroup[] {
  return locale === 'en' ? en : ar
}
