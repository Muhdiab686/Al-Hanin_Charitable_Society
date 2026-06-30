import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { EntryRedirect } from './auth/EntryRedirect'
import { GuestOnly } from './auth/GuestOnly'
import { RequireAuth } from './auth/RequireAuth'
import { RoleRoute } from './auth/RoleRoute'
import { AdminShell } from './layouts/AdminShell'
import { AppShell } from './layouts/AppShell'
import { AdminAidAutomationRoadmapPage } from './pages/admin/AdminAidAutomationRoadmapPage'
import { AdminBeneficiaryPriorityRoadmapPage } from './pages/admin/AdminBeneficiaryPriorityRoadmapPage'
import { AdminCampaignMissionControlPage } from './pages/admin/AdminCampaignMissionControlPage'
import { AdminCampaignReportingRoadmapPage } from './pages/admin/AdminCampaignReportingRoadmapPage'
import { AdminDonorChatPage } from './pages/admin/AdminDonorChatPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import {
  AdminEmbedAidPlans,
  AdminEmbedAidRequests,
  AdminEmbedBeneficiaries,
  AdminEmbedCategories,
  AdminEmbedClinic,
  AdminEmbedDonations,
  AdminEmbedInventory,
  AdminEmbedPayouts,
  AdminEmbedVolunteers,
} from './pages/admin/AdminEmbeds'
import { AdminDonationTraceExplainPage } from './pages/admin/AdminDonationTraceExplainPage'
import { AdminOperationalExpensesPage } from './pages/admin/AdminOperationalExpensesPage'
import { AdminRolesPage } from './pages/admin/AdminRolesPage'
import { AdminSpecializedReportsPage } from './pages/admin/AdminSpecializedReportsPage'
import { AdminStatisticalFinanceReportsPage } from './pages/admin/AdminStatisticalFinanceReportsPage'
import { AdminSystemBackupGuidePage } from './pages/admin/AdminSystemBackupGuidePage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AccountantDonationsPage } from './pages/accountant/AccountantDonationsPage'
import { CampaignReportingPage } from './pages/reporting/CampaignReportingPage'
import { AccountantExpensesPage } from './pages/accountant/AccountantExpensesPage'
import { AccountantPayoutsPage } from './pages/accountant/AccountantPayoutsPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { LoginPage } from './pages/auth/LoginPage'
import { BeneficiaryAidPage } from './pages/beneficiary/BeneficiaryAidPage'
import { BeneficiaryAppointmentsPage } from './pages/beneficiary/BeneficiaryAppointmentsPage'
import { BeneficiaryHomePage } from './pages/beneficiary/BeneficiaryHomePage'
import { BeneficiaryMedicalPage } from './pages/beneficiary/BeneficiaryMedicalPage'
import { BeneficiaryProfilePage } from './pages/beneficiary/BeneficiaryProfilePage'
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage'
import { DoctorHomePage } from './pages/doctor/DoctorHomePage'
import { DoctorMedicalPage } from './pages/doctor/DoctorMedicalPage'
import { DoctorPayoutPage } from './pages/doctor/DoctorPayoutPage'
import { DonorDonationsPage } from './pages/donor/DonorDonationsPage'
import { DonorChatPage } from './pages/donor/DonorChatPage'
import { DonorHomePage } from './pages/donor/DonorHomePage'
import { DonorUrgentAidPage } from './pages/donor/DonorUrgentAidPage'
import { AccountantDashboardPage } from './pages/roles/AccountantDashboardPage'
import { SecretaryAidPage } from './pages/secretary/SecretaryAidPage'
import { SecretaryAidPlansPage } from './pages/secretary/SecretaryAidPlansPage'
import { SecretaryBeneficiariesPage } from './pages/secretary/SecretaryBeneficiariesPage'
import { SecretaryCategoriesPage } from './pages/secretary/SecretaryCategoriesPage'
import { SecretaryClinicPage } from './pages/secretary/SecretaryClinicPage'
import { SecretaryHomePage } from './pages/secretary/SecretaryHomePage'
import { SecretaryQrPage } from './pages/secretary/SecretaryQrPage'
import { SecretaryMedicalPage } from './pages/secretary/SecretaryMedicalPage'
import { SecretaryVolunteersPage } from './pages/secretary/SecretaryVolunteersPage'
import { RecordingSecretaryHomePage } from './pages/recording-secretary/RecordingSecretaryHomePage'
import { StorekeeperAidPage } from './pages/storekeeper/StorekeeperAidPage'
import { StorekeeperDonationsPage } from './pages/storekeeper/StorekeeperDonationsPage'
import { StorekeeperHomePage } from './pages/storekeeper/StorekeeperHomePage'
import { StorekeeperInventoryPage } from './pages/storekeeper/StorekeeperInventoryPage'
import { StorekeeperPlansPage } from './pages/storekeeper/StorekeeperPlansPage'
import { StorekeeperQrPage } from './pages/storekeeper/StorekeeperQrPage'
import { VolunteerAidPage } from './pages/volunteer/VolunteerAidPage'
import { VolunteerHomePage } from './pages/volunteer/VolunteerHomePage'
import { VolunteerOpportunitiesPage } from './pages/volunteer/VolunteerOpportunitiesPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<EntryRedirect />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnly>
                <RegisterPage />
              </GuestOnly>
            }
          />

          <Route
            path="/app/admin"
            element={
              <RequireAuth>
                <RoleRoute allow={['admin']}>
                  <AdminShell />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<Navigate to="/app/admin/access/users" replace />} />
            <Route path="roles" element={<Navigate to="/app/admin/access/roles" replace />} />
            <Route path="access/users" element={<AdminUsersPage />} />
            <Route path="access/roles" element={<AdminRolesPage />} />
            <Route path="reports/statistics" element={<AdminStatisticalFinanceReportsPage />} />
            <Route path="reports/specialized" element={<AdminSpecializedReportsPage />} />
            <Route path="program/beneficiaries" element={<AdminEmbedBeneficiaries />} />
            <Route path="program/categories" element={<AdminEmbedCategories />} />
            <Route path="operations/inventory" element={<AdminEmbedInventory />} />
            <Route path="operations/donations" element={<AdminEmbedDonations />} />
            <Route path="operations/aid-requests" element={<AdminEmbedAidRequests />} />
            <Route path="operations/aid-plans" element={<AdminEmbedAidPlans />} />
            <Route path="operations/trace-donations" element={<AdminDonationTraceExplainPage />} />
            <Route path="people/volunteers" element={<AdminEmbedVolunteers />} />
            <Route path="clinic/overview" element={<AdminEmbedClinic />} />
            <Route path="finance/expenses" element={<AdminOperationalExpensesPage />} />
            <Route path="finance/payouts" element={<AdminEmbedPayouts />} />
            <Route path="campaigns/dashboard" element={<AdminCampaignMissionControlPage />} />
            <Route path="campaigns/reporting" element={<AdminCampaignReportingRoadmapPage />} />
            <Route path="policies/aid-suggestions" element={<AdminAidAutomationRoadmapPage />} />
            <Route path="policies/priorities" element={<AdminBeneficiaryPriorityRoadmapPage />} />
            <Route path="communications/notifications" element={<AdminDonorChatPage />} />
            <Route path="system/security" element={<Navigate to="/app/admin/system/backup" replace />} />
            <Route path="system/backup" element={<AdminSystemBackupGuidePage />} />
          </Route>

          <Route
            path="/app/secretary"
            element={
              <RequireAuth>
                <RoleRoute allow={['secretary']}>
                  <AppShell variant="secretary" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<SecretaryHomePage />} />
            <Route path="aid-requests" element={<SecretaryAidPage />} />
            <Route path="aid-plans" element={<SecretaryAidPlansPage />} />
            <Route path="categories" element={<SecretaryCategoriesPage />} />
            <Route path="clinic" element={<SecretaryClinicPage />} />
            <Route path="medical" element={<SecretaryMedicalPage />} />
            <Route path="volunteers" element={<SecretaryVolunteersPage />} />
            <Route path="campaign-reporting" element={<CampaignReportingPage />} />
            <Route path="qr" element={<SecretaryQrPage />} />
          </Route>

          <Route
            path="/app/recording-secretary"
            element={
              <RequireAuth>
                <RoleRoute allow={['recording_secretary']}>
                  <AppShell variant="recording_secretary" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<RecordingSecretaryHomePage />} />
            <Route path="beneficiaries" element={<SecretaryBeneficiariesPage />} />
            <Route path="aid-requests" element={<SecretaryAidPage />} />
            <Route path="aid-plans" element={<SecretaryAidPlansPage />} />
            <Route path="categories" element={<SecretaryCategoriesPage />} />
            <Route path="volunteers" element={<SecretaryVolunteersPage />} />
            <Route path="campaign-reporting" element={<CampaignReportingPage />} />
            <Route path="qr" element={<SecretaryQrPage />} />
          </Route>

          <Route
            path="/app/accountant"
            element={
              <RequireAuth>
                <RoleRoute allow={['accountant']}>
                  <AppShell variant="accountant" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<AccountantDashboardPage />} />
            <Route path="donations" element={<AccountantDonationsPage />} />
            <Route path="expenses" element={<AccountantExpensesPage />} />
            <Route path="campaign-reporting" element={<CampaignReportingPage />} />
            <Route path="payouts" element={<AccountantPayoutsPage />} />
          </Route>

          <Route
            path="/app/doctor"
            element={
              <RequireAuth>
                <RoleRoute allow={['doctor']}>
                  <AppShell variant="doctor" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<DoctorHomePage />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
            <Route path="medical" element={<DoctorMedicalPage />} />
            <Route path="payouts" element={<DoctorPayoutPage />} />
          </Route>

          <Route
            path="/app/storekeeper"
            element={
              <RequireAuth>
                <RoleRoute allow={['storekeeper']}>
                  <AppShell variant="storekeeper" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<StorekeeperHomePage />} />
            <Route path="donations" element={<StorekeeperDonationsPage />} />
            <Route path="inventory" element={<StorekeeperInventoryPage />} />
            <Route path="aid" element={<StorekeeperAidPage />} />
            <Route path="plans" element={<StorekeeperPlansPage />} />
            <Route path="qr" element={<StorekeeperQrPage />} />
          </Route>

          <Route
            path="/app/donor"
            element={
              <RequireAuth>
                <RoleRoute allow={['donor']}>
                  <AppShell variant="donor" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<DonorHomePage />} />
            <Route path="chat" element={<DonorChatPage />} />
            <Route path="donations" element={<DonorDonationsPage />} />
            <Route path="urgent-aid" element={<DonorUrgentAidPage />} />
          </Route>

          <Route
            path="/app/volunteer"
            element={
              <RequireAuth>
                <RoleRoute allow={['volunteer']}>
                  <AppShell variant="volunteer" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<VolunteerHomePage />} />
            <Route path="aid" element={<VolunteerAidPage />} />
            <Route path="opportunities" element={<VolunteerOpportunitiesPage />} />
          </Route>

          <Route
            path="/app/beneficiary"
            element={
              <RequireAuth>
                <RoleRoute allow={['beneficiary']}>
                  <AppShell variant="beneficiary" />
                </RoleRoute>
              </RequireAuth>
            }
          >
            <Route index element={<BeneficiaryHomePage />} />
            <Route path="profile" element={<BeneficiaryProfilePage />} />
            <Route path="aid" element={<BeneficiaryAidPage />} />
            <Route path="appointments" element={<BeneficiaryAppointmentsPage />} />
            <Route path="medical" element={<BeneficiaryMedicalPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
