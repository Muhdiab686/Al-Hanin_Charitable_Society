import { AccountantDonationsPage } from '../accountant/AccountantDonationsPage'
import { AccountantPayoutsPage } from '../accountant/AccountantPayoutsPage'
import { SecretaryAidPage } from '../secretary/SecretaryAidPage'
import { SecretaryAidPlansPage } from '../secretary/SecretaryAidPlansPage'
import { SecretaryBeneficiariesPage } from '../secretary/SecretaryBeneficiariesPage'
import { SecretaryCategoriesPage } from '../secretary/SecretaryCategoriesPage'
import { SecretaryClinicPage } from '../secretary/SecretaryClinicPage'
import { SecretaryVolunteersPage } from '../secretary/SecretaryVolunteersPage'
import { StorekeeperInventoryPage } from '../storekeeper/StorekeeperInventoryPage'

export function AdminEmbedBeneficiaries() {
  return <SecretaryBeneficiariesPage />
}

export function AdminEmbedCategories() {
  return <SecretaryCategoriesPage />
}

export function AdminEmbedInventory() {
  return <StorekeeperInventoryPage />
}

export function AdminEmbedDonations() {
  return <AccountantDonationsPage />
}

export function AdminEmbedVolunteers() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-50/95">
        <p className="font-semibold text-white">قياس مشاركة المتطوعين ومتابعة الأداء</p>
        <p className="mt-2 text-emerald-100/90">
          تابع اشغال المقاعد، حالة كل فرصة، وحمولة التسجيلات لمقارنة أداء المناشير المختلفة بين الفترات.
        </p>
      </div>
      <SecretaryVolunteersPage />
    </div>
  )
}

export function AdminEmbedAidRequests() {
  return <SecretaryAidPage />
}

export function AdminEmbedAidPlans() {
  return <SecretaryAidPlansPage />
}

export function AdminEmbedClinic() {
  return <SecretaryClinicPage />
}

export function AdminEmbedPayouts() {
  return <AccountantPayoutsPage />
}
