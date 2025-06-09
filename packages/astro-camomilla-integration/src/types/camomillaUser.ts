export interface CamomillaUser {
  id: number
  user_permissions: string[]
  group_permissions: string[]
  all_permissions: string[]
  last_login: string | null
  is_superuser: boolean
  username: string
  first_name: string
  last_name: string
  email: string
  is_staff: boolean
  is_active: boolean
  date_joined: string
  groups: string[]
}
