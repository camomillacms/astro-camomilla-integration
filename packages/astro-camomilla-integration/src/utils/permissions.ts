import type { CamomillaUser } from '../types/camomillaUser.ts'

export const isAccessGranted = (user: CamomillaUser): boolean => {
  if (!user.is_superuser) return false
  if (!user.is_staff) return false
  if (!user.is_active) return false
  return true
}

export const isStaff = (user: CamomillaUser): boolean => {
  if (!user.is_staff) return false
  if (!user.is_active) return false
  return true
}