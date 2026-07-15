import type { AstroSharedContext } from 'astro'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'

/**
 * Server-side proxy for camomilla's Django staticfiles, exposed same-origin at
 * `/static/[...]`. Lets browser code (e.g. <DjSuperAdminScript>'s default
 * bundleSrc) load Django static assets with no reverse proxy in dev.
 *
 * Which paths are proxied is the `staticProxy` option:
 *   true             proxy everything under /static (default)
 *   false            route not injected — this handler never runs
 *   { allow: [...] } only paths starting with one of these prefixes
 *   { deny:  [...] } everything except paths starting with these prefixes
 * (allow + deny together: deny wins, then allow filters the rest.)
 *
 * A traversal guard rejects any path that would escape /static/, so a request
 * like `/static/../api/...` can never turn this into an open proxy to the rest
 * of the backend.
 *
 * Injected by the integration at /static/[...path] unless staticProxy is false.
 */
function isPathAllowed(path: string): boolean {
  const { staticProxy } = getIntegrationOptions()
  if (staticProxy === false) return false
  if (staticProxy == null || staticProxy === true) return true
  const { allow, deny } = staticProxy
  if (deny?.some((p) => path.startsWith(p))) return false
  if (allow && !allow.some((p) => path.startsWith(p))) return false
  return true
}

export async function GET(context: AstroSharedContext): Promise<Response> {
  const { server } = getIntegrationOptions()
  const path = context.params.path ?? ''

  // new URL() collapses any `..`; the `static/` prefix also neutralizes scheme
  // injection (`http:` becomes a path segment). If the normalized target no
  // longer sits under /static/, it was a traversal attempt — refuse it.
  const base = new URL('static/', `${server}/`)
  const target = new URL(`static/${path}`, `${server}/`)
  if (!target.href.startsWith(base.href) || !isPathAllowed(path)) {
    return new Response('Not found', { status: 404 })
  }

  const res = await fetch(target)
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': res.headers.get('cache-control') ?? 'public, max-age=3600'
    }
  })
}
