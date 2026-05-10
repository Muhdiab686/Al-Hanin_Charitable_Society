export type RoleOverviewWidget = {
  key: string
  label: string
  value: string | number
}

export type RoleOverviewChart = {
  id: string
  title: string
  kind: 'bar'
  items: { label: string; value: number }[]
}

export type RoleOverviewPayload = {
  _kind: 'role_overview'
  role: string
  title: string
  widgets: RoleOverviewWidget[]
  charts: RoleOverviewChart[]
  notice?: string
}
