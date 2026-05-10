export type AdminNavLink = {
  to: string
  label: string
}

export type AdminNavGroup = {
  title: string
  links: AdminNavLink[]
}
