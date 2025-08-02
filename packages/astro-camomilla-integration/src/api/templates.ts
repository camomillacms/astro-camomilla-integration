import type { AstroSharedContext } from 'astro'
import { templates } from 'virtual:camomilla-templates-map'
import { isAccessGranted } from '../utils/permissions.ts'

export function GET(context: AstroSharedContext): Response {
  if (context.locals.camomilla?.user && isAccessGranted(context.locals.camomilla.user)) {
    const templateNames = Object.keys(templates ?? {})
    return new Response(JSON.stringify(templateNames))
  }

  return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
}
