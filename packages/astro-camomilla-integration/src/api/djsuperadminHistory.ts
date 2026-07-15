import type { AstroSharedContext } from 'astro'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'
import { isAccessGranted } from '../utils/permissions.ts'

/**
 * Server-side proxy for djsuperadmin's version history (the clock/revert panel).
 *
 * Sibling of ./djsuperadmin.ts — same same-origin, server-to-server forwarding —
 * but read-only: GET a block's versions. Injected at
 * /api/djsuperadmin/content/[id]/history and pointed at camomilla's
 * `.../djsuperadmin/history/`, which returns `{"versions": [{created_at, data}]}`.
 * <CamomillaContent> passes this as the block's historyUrl; the editor bundle
 * fetches it to list prior states and reverts via a normal PATCH.
 */
export async function GET(context: AstroSharedContext): Promise<Response> {
  const user = context.locals.camomilla?.user
  if (!user || !isAccessGranted(user)) {
    return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
  }

  const { server } = getIntegrationOptions()
  const language = new URL(context.request.url).searchParams.get('language')
  const query = language ? `?language=${encodeURIComponent(language)}` : ''
  const url = `${server}/api/camomilla/contents/${encodeURIComponent(
    context.params.id ?? ''
  )}/djsuperadmin/history/${query}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      cookie: context.request.headers.get('cookie') ?? ''
    }
  })
  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' }
  })
}
