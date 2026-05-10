import { apiClient } from './client'
import type { AdminDashboardPayload, ApiUser, Paginated } from '../types/models'
import type { RoleOverviewPayload } from '../types/overview'

const v1 = '/api/v1'

export async function login(payload: {
  email: string
  password: string
  device_name?: string
}): Promise<{ token: string; user: ApiUser }> {
  const { data } = await apiClient.post<{
    token: string
    user: ApiUser
  }>(`${v1}/auth/login`, payload)
  return data
}

export async function register(payload: {
  name: string
  email: string
  password: string
  password_confirmation: string
  role?: 'beneficiary' | 'donor'
}): Promise<{ token: string; user: ApiUser }> {
  const { data } = await apiClient.post<{
    token: string
    user: ApiUser
  }>(`${v1}/auth/register`, payload)
  return data
}

export async function fetchMe(): Promise<ApiUser> {
  const { data } = await apiClient.get<{ user: ApiUser }>(`${v1}/auth/me`)
  return data.user
}

export async function logout(): Promise<void> {
  await apiClient.post(`${v1}/auth/logout`)
}

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const { data } = await apiClient.get<AdminDashboardPayload>(`${v1}/admin/dashboard`)
  return data
}

export async function fetchRoleOverview(): Promise<RoleOverviewPayload> {
  const { data } = await apiClient.get<RoleOverviewPayload>(`${v1}/overview`)
  return data
}

export async function fetchAdminUsers(params?: {
  page?: number
  search?: string
  role?: string
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/admin/users`,
    { params },
  )
  return data
}

export async function fetchAdminUser(id: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<{ user: Record<string, unknown> }>(
    `${v1}/admin/users/${id}`,
  )
  return data.user
}

export async function createAdminUser(payload: {
  name: string
  email: string
  password: string
  password_confirmation: string
  role: string
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/admin/users`, payload)
  return data
}

export async function updateAdminUser(
  id: number,
  payload: {
    name?: string
    email?: string
    password?: string
    password_confirmation?: string
    role?: string
  },
): Promise<unknown> {
  const { data } = await apiClient.patch(`${v1}/admin/users/${id}`, payload)
  return data
}

export async function deleteAdminUser(id: number): Promise<void> {
  await apiClient.delete(`${v1}/admin/users/${id}`)
}

export async function fetchAdminRoles(): Promise<{
  roles: { name: string; permissions: string[] }[]
  assignable_roles: { value: string; case: string }[]
}> {
  const { data } = await apiClient.get<{
    roles: { name: string; permissions: string[] }[]
    assignable_roles: { value: string; case: string }[]
  }>(`${v1}/admin/roles`)
  return data
}

export async function fetchBeneficiaries(params?: {
  page?: number
  /** بحث متقدّم: الاسم، الرقم الوطني، معرّف المستفيد أو العائلة، أو كود العائلة */
  search?: string
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/beneficiaries`,
    { params },
  )
  return data
}

export async function fetchBeneficiary(id: number): Promise<{ beneficiary: Record<string, unknown> }> {
  const { data } = await apiClient.get<{ beneficiary: Record<string, unknown> }>(
    `${v1}/beneficiaries/${id}`,
  )
  return data
}

export async function fetchBeneficiaryLabReports(
  beneficiaryId: number,
  params?: { page?: number },
): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/beneficiaries/${beneficiaryId}/lab-reports`,
    { params },
  )
  return data
}

export async function uploadBeneficiaryLabReport(
  beneficiaryId: number,
  payload: { title: string; findings?: string; file?: File | null },
): Promise<{ message?: string; report: Record<string, unknown> }> {
  const form = new FormData()
  form.append('title', payload.title)
  if (payload.findings?.trim()) {
    form.append('findings', payload.findings.trim())
  }
  if (payload.file) {
    form.append('attachment', payload.file)
  }
  const { data } = await apiClient.post<{ message?: string; report: Record<string, unknown> }>(
    `${v1}/beneficiaries/${beneficiaryId}/lab-reports`,
    form,
  )
  return data
}

export async function createBeneficiary(payload: {
  family: Record<string, unknown>
  beneficiary: Record<string, unknown>
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/beneficiaries`, payload)
  return data
}

export async function updateBeneficiary(
  id: number,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${v1}/beneficiaries/${id}`, payload)
  return data
}

export async function recalculateBeneficiaryCategory(id: number): Promise<unknown> {
  const { data } = await apiClient.post(
    `${v1}/beneficiaries/${id}/recalculate-category`,
  )
  return data
}

export async function fetchBeneficiaryMedicalWallet(
  beneficiaryId: number,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(
    `${v1}/beneficiaries/${beneficiaryId}/medical-wallet`,
  )
  return data
}

export async function creditBeneficiaryMedicalWallet(
  beneficiaryId: number,
  payload: { amount: number; prescription_reference?: string; notes?: string },
): Promise<unknown> {
  const { data } = await apiClient.post(
    `${v1}/beneficiaries/${beneficiaryId}/medical-wallet/credits`,
    payload,
  )
  return data
}

export async function updateFamilyEnrollmentStatus(
  familyId: number,
  payload: { enrollment_status: string },
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `${v1}/families/${familyId}/enrollment-status`,
    payload,
  )
  return data
}

export async function updateFamilyAidEligibility(
  familyId: number,
  payload: { has_direct_income: boolean; aid_pause_reason?: string },
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `${v1}/families/${familyId}/aid-eligibility`,
    payload,
  )
  return data
}

export async function updateFamilyProfile(
  familyId: number,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${v1}/families/${familyId}`, payload)
  return data
}

export async function fetchFamilyQrCode(familyId: number): Promise<{
  payload: string
  png_base64: string
  mime_type: string
}> {
  const { data } = await apiClient.get(`${v1}/families/${familyId}/qr-code`)
  return data as { payload: string; png_base64: string; mime_type: string }
}

export async function postQrVerify(payload: { payload: string }): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/qr/verify`, payload)
  return data
}

export async function fetchAidRequests(params?: {
  page?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/aid-requests`,
    { params },
  )
  return data
}

export async function createAidRequest(payload: {
  beneficiary_id: number
  type: string
  requested_amount?: number | null
  description: string
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/aid-requests`, payload)
  return data
}

export async function reviewAidRequest(
  aidRequestId: number,
  payload: { decision: string; review_note?: string | null },
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `${v1}/aid-requests/${aidRequestId}/review`,
    payload,
  )
  return data
}

export async function postAidInventoryDistribution(
  aidRequestId: number,
  payload: {
    items: Array<{
      inventory_item_id: number
      quantity: number
      notes?: string | null
    }>
  },
): Promise<unknown> {
  const { data } = await apiClient.post(
    `${v1}/aid-requests/${aidRequestId}/inventory-distributions`,
    payload,
  )
  return data
}

export async function confirmAidDelivery(
  aidRequestId: number,
  payload: { allocation_ids: number[]; delivery_note?: string | null },
): Promise<unknown> {
  const { data } = await apiClient.post(
    `${v1}/aid-requests/${aidRequestId}/deliveries`,
    payload,
  )
  return data
}

export async function fetchAidDistributionPlans(params?: {
  page?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/aid-distribution-plans`,
    { params },
  )
  return data
}

export async function createAidDistributionPlan(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/aid-distribution-plans`, payload)
  return data
}

export async function fetchCategoryRules(): Promise<{
  categories: Record<string, unknown>[]
}> {
  const { data } = await apiClient.get<{ categories: Record<string, unknown>[] }>(
    `${v1}/categories/rules`,
  )
  return data
}

export async function upsertCategoryRule(
  categoryId: number,
  payload: {
    max_monthly_income?: number | null
    min_family_members?: number | null
    requires_medical_case: boolean
    is_active: boolean
  },
): Promise<unknown> {
  const { data } = await apiClient.put(`${v1}/categories/${categoryId}/rule`, payload)
  return data
}

export async function fetchDonations(params?: {
  page?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/donations`,
    { params },
  )
  return data
}

export async function fetchDonation(id: number): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`${v1}/donations/${id}`)
  return data
}

export async function createDonation(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/donations`, payload)
  return data
}

export async function fetchInventoryItems(params?: {
  page?: number
  q?: string
  spoilage_category?: string
  status?: string
  expires_before?: string
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/inventory-items`,
    { params },
  )
  return data
}

export async function removeInventoryItem(
  inventoryItemId: number,
  payload: { quantity: number; reason: string; notes?: string | null },
): Promise<unknown> {
  const { data } = await apiClient.post(
    `${v1}/inventory-items/${inventoryItemId}/remove`,
    payload,
  )
  return data
}

export async function fetchClinicStaff(params?: {
  page?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/clinic/staff`,
    { params },
  )
  return data
}

export async function upsertClinicStaff(payload: {
  user_id: number
  monthly_salary: number
  consultation_fee: number
  is_active: boolean
  role: string
}): Promise<unknown> {
  const { data } = await apiClient.put(`${v1}/clinic/staff`, payload)
  return data
}

export async function fetchAppointments(params?: {
  page?: number
  from?: string
  to?: string
  beneficiary_id?: number
  /** scheduled | cancelled | completed */
  status?: string
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/appointments`,
    { params },
  )
  return data
}

export async function createAppointment(payload: {
  beneficiary_id: number
  doctor_id: number
  scheduled_at: string
  reason?: string | null
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/appointments`, payload)
  return data
}

export async function cancelAppointment(
  appointmentId: number,
  payload: { cancellation_reason: string },
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `${v1}/appointments/${appointmentId}/cancel`,
    payload,
  )
  return data
}

export async function fetchMedicalRecords(params?: {
  page?: number
  beneficiary_id?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/medical-records`,
    { params },
  )
  return data
}

export async function createMedicalRecord(payload: {
  clinic_appointment_id: number
  diagnosis: string
  tests_result?: string | null
  prescription?: string | null
  prescription_cost?: number | null
  notes?: string | null
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/medical-records`, payload)
  return data
}

export async function fetchDoctorPayoutRequests(params?: {
  page?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/doctor-payout-requests`,
    { params },
  )
  return data
}

export async function createDoctorPayoutRequest(payload: {
  period_start: string
  period_end: string
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/doctor-payout-requests`, payload)
  return data
}

export async function reviewDoctorPayoutRequest(
  id: number,
  payload: { decision: string; review_note?: string | null },
): Promise<unknown> {
  const { data } = await apiClient.patch(
    `${v1}/doctor-payout-requests/${id}/review`,
    payload,
  )
  return data
}

export type FinanceSummaryResponse = {
  totals: { income: string; expenses: string; net: string }
  transactions: unknown[]
}

export async function fetchFinanceSummary(params?: {
  from?: string
  to?: string
}): Promise<FinanceSummaryResponse> {
  const { data } = await apiClient.get<FinanceSummaryResponse>(`${v1}/finance/summary`, {
    params,
  })
  return data
}

export async function createOperationalExpense(payload: {
  amount: number
  description?: string
  invoice_reference?: string
  vendor?: string
  notes?: string
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/finance/expenses`, payload)

  return data
}

export async function fetchVolunteerOpportunities(params?: {
  status?: string
  page?: number
}): Promise<Paginated<Record<string, unknown>>> {
  const { data } = await apiClient.get<Paginated<Record<string, unknown>>>(
    `${v1}/volunteer-opportunities`,
    { params },
  )
  return data
}

export type CampaignReportingResponse = {
  _kind: string
  generated_at: string
  summary: {
    cash_grand_total: number
    in_kind_total_quantity_units: number
    awareness_activities_count: number
    methodology_notes_ar: string[]
  }
  cash_by_campaign_tag: {
    key: string
    label: string
    total_cash: number
    donations_count: number
  }[]
  in_kind_by_campaign_tag: {
    key: string
    label: string
    donations_count: number
    sku_lines: number
    total_quantity_units: number
  }[]
  awareness_activities: {
    id: number
    title: string
    description: string | null
    starts_at: string | null
    ends_at: string | null
    status: string
    linked_beneficiaries_count: number
    volunteer_slots_filled: number
    volunteer_slots_required: number
  }[]
}

export async function fetchCampaignReporting(): Promise<CampaignReportingResponse> {
  const { data } = await apiClient.get<CampaignReportingResponse>(`${v1}/reporting/campaigns`)
  return data
}

export async function createVolunteerOpportunity(payload: {
  title: string
  description?: string | null
  required_slots: number
  starts_at: string
  ends_at?: string | null
  activity_kind?: string
}): Promise<unknown> {
  const { data } = await apiClient.post(`${v1}/volunteer-opportunities`, payload)
  return data
}

export async function syncVolunteerOpportunityLinkedBeneficiaries(
  opportunityId: number,
  beneficiaryIds: number[],
): Promise<unknown> {
  const { data } = await apiClient.patch(`${v1}/volunteer-opportunities/${opportunityId}/linked-beneficiaries`, {
    beneficiary_ids: beneficiaryIds,
  })
  return data
}

export async function updateVolunteerOpportunity(
  id: number,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.patch(`${v1}/volunteer-opportunities/${id}`, payload)
  return data
}

export async function deleteVolunteerOpportunity(id: number): Promise<void> {
  await apiClient.delete(`${v1}/volunteer-opportunities/${id}`)
}

export async function registerForOpportunity(opportunityId: number): Promise<unknown> {
  const { data } = await apiClient.post(
    `${v1}/volunteer-opportunities/${opportunityId}/register`,
  )
  return data
}

/** Donor inbox / admin donor chat thread */
export type DonorChatMessageDto = {
  id: number
  body: string
  is_from_donor: boolean
  created_at: string | null
  sender: { id: number; name: string } | null
}

export type DonorChatDonorRowDto = {
  id: number
  name: string
  email: string
  messages_count: number
}

export async function fetchDonorChatDonors(): Promise<DonorChatDonorRowDto[]> {
  const { data } = await apiClient.get<{ donors: DonorChatDonorRowDto[] }>(
    `${v1}/communications/donor-chat/donors`,
  )
  return data.donors
}

export async function fetchDonorChatThread(donorId: number): Promise<DonorChatMessageDto[]> {
  const { data } = await apiClient.get<{ messages: DonorChatMessageDto[] }>(
    `${v1}/communications/donor-chat/donors/${donorId}/messages`,
  )
  return data.messages
}

export async function postAdminDonorChatMessage(
  donorId: number,
  body: string,
): Promise<{ message: DonorChatMessageDto }> {
  const { data } = await apiClient.post<{ message: DonorChatMessageDto }>(
    `${v1}/communications/donor-chat/donors/${donorId}/messages`,
    { body },
  )
  return data
}

export async function fetchMyDonorChatMessages(): Promise<DonorChatMessageDto[]> {
  const { data } = await apiClient.get<{ messages: DonorChatMessageDto[] }>(`${v1}/donor-chat/messages`)
  return data.messages
}

export async function postMyDonorChatMessage(body: string): Promise<{ message: DonorChatMessageDto }> {
  const { data } = await apiClient.post<{ message: DonorChatMessageDto }>(`${v1}/donor-chat/messages`, { body })
  return data
}
