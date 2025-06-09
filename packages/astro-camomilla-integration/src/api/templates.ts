import type { AstroSharedContext } from 'astro'
import { templates } from 'virtual:camomilla-templates-map'
import type { CamomillaUser } from '../types/camomillaUser.ts'

const isAccessGranted = (user: CamomillaUser): boolean => {
  if (!user) return false
  if (!user.is_superuser) return false
  if (!user.is_staff) return false
  if (!user.is_active) return false
  return true
}

export function GET(context: AstroSharedContext): Response {
  if (isAccessGranted(context.locals.camomilla.user)) {
    const templateNames = Object.keys(templates)
    return new Response(JSON.stringify(templateNames))
  }

  return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
}
