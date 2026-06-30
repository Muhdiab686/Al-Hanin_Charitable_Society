export type UserRole =
  | 'admin'
  | 'secretary'
  | 'recording_secretary'
  | 'accountant'
  | 'doctor'
  | 'storekeeper'
  | 'volunteer'
  | 'beneficiary'
  | 'donor'

export type ApiUser = {
  id: number
  name: string
  email: string
  role: UserRole
  beneficiary_id?: number | null
}

export type AdminDashboardPayload = {
  widgets: {
    sponsored_families: number
    cash_donations_this_month: string
    active_volunteers: number
    treasury_balance: string
  }
  families: { total: number; by_enrollment_status: Record<string, number> }
  beneficiaries: { total: number }
  aid_requests: { total: number; by_status: Record<string, number> }
  users: { total: number; by_role: Record<string, number> }
  donations: { total: number; by_type: Record<string, number> }
  inventory_items: { total: number; by_status: Record<string, number> }
  analytics: {
    year: number
    warehouse_consumption_by_month: Array<{
      month: number
      distributed: number
      removed: number
      total_consumption: number
    }>
    aid_distribution_by_type: Record<string, number>
    donations_by_channel: Record<string, number>
    recent_donations: unknown[]
    recent_aid_requests: unknown[]
  }
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}
