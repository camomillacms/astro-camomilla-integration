import type { APIContext } from 'astro'
import { extractForwardedHeaders } from './headers.ts'
import { getIntegrationOptions } from './getIntegrationOptions.ts'
import type { CamomillaMenu } from '../types/camomillaMenu.ts'

/**
 * Per-request memo: the same render often asks for the same menu more
 * than once (e.g. header + footer + a sidebar). Keyed by the APIContext
 * so it scopes to a single request and gets garbage-collected with it.
 */
const REQUEST_CACHE = new WeakMap<APIContext, Map<string, CamomillaMenu | null>>()

async function buildAuthHeaders(
  context: APIContext,
  forwardedHeaders: string[]
): Promise<Record<string, string>> {
  const headers: Record<string, string> = extractForwardedHeaders(context, forwardedHeaders)
  const sessionCookie = await context.cookies.get('sessionid')
  const csrfCookie = await context.cookies.get('csrftoken')
  if (sessionCookie && csrfCookie) {
    headers.Cookie = `sessionid=${sessionCookie.value}; csrftoken=${csrfCookie.value}`
    headers['X-CSRFToken'] = csrfCookie.value
  }
  return headers
}

/**
 * Fetch a camomilla menu by its ``key`` (e.g. ``"main"``, ``"footer"``).
 *
 * Camomilla serves menus publicly (read-only) so a headless frontend can
 * render navigation without a session. The visitor's session cookies are
 * still forwarded when present, so authenticated staff contexts keep
 * working; anonymous visitors get the menu too.
 *
 * Active-language aware: detects the language prefix on the current URL
 * (``/it/...``) and asks the API for that language so the menu's
 * translatable ``nodes`` come back in the same locale the page is
 * rendering in.
 *
 * Per-request memoized: calling ``fetchMenu("main", Astro)`` from both
 * a header and a footer in the same render only round-trips to camomilla
 * once.
 *
 * Returns ``null`` on any failure path (auth denied, missing key, network
 * error). Callers should render gracefully — usually "no menu shown".
 */
export async function fetchMenu(key: string, context: APIContext): Promise<CamomillaMenu | null> {
  let cache = REQUEST_CACHE.get(context)
  if (!cache) {
    cache = new Map()
    REQUEST_CACHE.set(context, cache)
  }
  if (cache.has(key)) return cache.get(key) ?? null

  const { server, forwardedHeaders } = getIntegrationOptions()
  const headers = await buildAuthHeaders(context, forwardedHeaders)

  const pathname = context.url.pathname
  const prefixMatch = pathname.match(/^\/([a-z]{2})(\/|$)/)
  const activeLang = prefixMatch ? prefixMatch[1] : null

  // Public resolver, keyed by menu key — standalone from the admin-gated
  // ``menus`` viewset so anonymous visitors get navigation too.
  const url = new URL(`${server}/api/camomilla/menus-router/${encodeURIComponent(key)}`)
  if (activeLang) url.searchParams.set('language', activeLang)

  const resp = await fetch(url.toString(), { headers })
  if (!resp.ok) {
    cache.set(key, null)
    return null
  }
  const menu = (await resp.json()) as CamomillaMenu
  cache.set(key, menu)
  return menu
}
