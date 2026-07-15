import type { AstroSharedContext } from 'astro'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'
import { isAccessGranted } from '../utils/permissions.ts'

/**
 * Server-side proxy for djsuperadmin's content GET/PATCH.
 *
 * The browser talks only to this Astro route (same-origin — no CORS). We forward
 * to camomilla server-to-server; because a server fetch carries no browser
 * `Origin` header, Django's CSRF origin check is skipped and the forwarded CSRF
 * token validates. Works the same in dev and production, with no reverse proxy
 * and no CSRF_TRUSTED_ORIGINS config.
 *
 * Injected by the integration at /api/djsuperadmin/content/[id] — edit a block by
 * pk, optionally scoped to a language via ``?language=<code>``. The id comes from
 * the page-router payload (or the base api's get-or-create for a brand-new one,
 * done server-side in the component); the language comes from the page the block
 * is rendered on. CamomillaContent points its get/patch URLs here.
 */

function backendUrl(params: Record<string, string | undefined>, language: string | null): string {
  const { server } = getIntegrationOptions()
  const query = language ? `?language=${encodeURIComponent(language)}` : ''
  return `${server}/api/camomilla/contents/${encodeURIComponent(params.id ?? '')}/djsuperadmin/${query}`
}

function readCookie(cookieHeader: string, name: string): string {
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

async function proxy(context: AstroSharedContext, method: 'GET' | 'PATCH'): Promise<Response> {
  // Only superusers may edit; the browser never sees these URLs otherwise, but
  // gate here too. camomilla enforces its own permissions regardless.
  const user = context.locals.camomilla?.user
  if (!user || !isAccessGranted(user)) {
    return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
  }

  const cookie = context.request.headers.get('cookie') ?? ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json', cookie }
  const init: RequestInit = { method, headers }
  if (method === 'PATCH') {
    // Django SessionAuthentication still requires the CSRF token; forward it.
    headers['X-CSRFToken'] = readCookie(cookie, 'csrftoken')
    init.body = await context.request.text()
  }

  const language = new URL(context.request.url).searchParams.get('language')
  const res = await fetch(backendUrl(context.params, language), init)
  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' }
  })
}

export function GET(context: AstroSharedContext): Promise<Response> {
  return proxy(context, 'GET')
}

export function PATCH(context: AstroSharedContext): Promise<Response> {
  return proxy(context, 'PATCH')
}
