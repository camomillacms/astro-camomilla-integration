import type { MiddlewareHandler, APIContext, MiddlewareNext } from 'astro'
import { extractForwardedHeaders } from '../utils/headers.ts'
import {
  isRedirectResponse,
  type CamomillaRedirect,
  type CamomillaRouterResponse
} from '../types/camomillaPage.ts'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'

const STATIC_ASSET_PATH_RE =
  /^\/(favicon\.ico|robots\.txt|manifest\.json|assets\/|.*\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|otf|mp4|webm|txt|xml|json))$/

/**
 * Turn a camomilla ``{ redirect, status }`` router body into an absolute
 * redirect Response. Shared by the public and preview paths — both routers
 * can answer a permalink with a canonical redirect instead of a page.
 */
function toRedirect(context: APIContext, body: CamomillaRedirect): Response {
  const baseUrl = context.url.href.replace(context.url.pathname, '')
  return Response.redirect(`${baseUrl}${body.redirect}`, body.status)
}

/**
 * Build the cookie + CSRF header pair used by the camomilla API for
 * staff-authenticated requests. Returns ``null`` when either cookie is
 * missing — the caller must treat that as "no preview attempt possible."
 */
async function buildAuthHeaders(
  context: APIContext,
  forwardedHeaders: string[]
): Promise<Record<string, string> | null> {
  const sessionCookie = await context.cookies.get('sessionid')
  const csrfCookie = await context.cookies.get('csrftoken')
  if (!sessionCookie || !csrfCookie) return null
  return {
    ...extractForwardedHeaders(context, forwardedHeaders),
    Cookie: `sessionid=${sessionCookie.value}; csrftoken=${csrfCookie.value}`,
    'X-CSRFToken': csrfCookie.value
  }
}

/**
 * Resolve a page by permalink via the authenticated preview router.
 *
 * Camomilla 6.4+ ships ``/api/camomilla/pages-router-preview/<permalink>``
 * — same response shape as the public ``pages-router`` (``RouteSerializer``),
 * but auth-required, bypasses the ``is_public`` gate, and overlays the
 * active-language Draft with ``has_draft: true``. Returns the same shape
 * for **public pages with a pending draft** too: the live row is the base
 * and the draft fields are layered on top. This is the common preview
 * case — editors checking what their pending edits will look like.
 *
 * Returns ``null`` when (a) the request lacks the session cookies needed
 * to authenticate, or (b) the camomilla server denies the request
 * (permission, missing permalink, …). Callers fall through to the public
 * router in both cases.
 */
async function fetchPagePreview(
  pathname: string,
  context: APIContext
): Promise<{ body: CamomillaRouterResponse; response: Response } | null> {
  const { server, forwardedHeaders } = getIntegrationOptions()
  const authHeaders = await buildAuthHeaders(context, forwardedHeaders)
  if (!authHeaders) return null

  const previewResp = await fetch(`${server}/api/camomilla/pages-router-preview${pathname}`, {
    headers: authHeaders
  })
  if (!previewResp.ok) return null

  const body = (await previewResp.json()) as CamomillaRouterResponse
  return { body, response: previewResp }
}

/**
 * Middleware to handle page-related requests in the Camomilla integration.
 * It fetches the page data from the Camomilla server based on the request URL.
 *
 * Lifecycle (camomilla 6.4+):
 *
 * - Public requests hit ``pages-router``. The server gates on ``is_public``
 *   after a lazy ``publish_if_due()`` attempt, so trashed / draft / scheduled
 *   rows return 404. There is no client-side ``is_public`` check anymore.
 *
 * - Preview requests (``?preview=true``) attempt the authenticated preview
 *   router **first** when the request carries valid session + CSRF cookies.
 *   This handles every preview case uniformly:
 *     · public page + pending draft → live shown with draft fields overlaid
 *     · never-public page → bypass the is_public gate
 *     · trashed / scheduled-first-publish → bypass the is_public gate
 *   Going public-first would silently drop the overlay on already-live
 *   pages, which is the most common preview case in practice.
 *
 *   Preview responses (and the public fallback for failed preview attempts)
 *   are marked ``NEVER_CACHE`` so an editor's URL never poisons the shared
 *   cache with a different user's view.
 */
export const middlewarePage: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext
) => {
  const { server, forwardedHeaders } = getIntegrationOptions()
  const serverUrl = server

  if (STATIC_ASSET_PATH_RE.test(context.url.pathname)) {
    return next()
  }

  const previewRequested = context.url.searchParams?.get('preview') === 'true'

  if (previewRequested) {
    // Anything served on a ``?preview=true`` URL must not be cached: a
    // subsequent visitor (different cookies, or none) hitting the same URL
    // would otherwise receive this editor's view. Set the flag up-front so
    // it applies whether the preview succeeds OR we fall through to public.
    context.locals.camomilla.cache?.('NEVER_CACHE')

    const preview = await fetchPagePreview(context.url.pathname, context)
    if (preview) {
      if (isRedirectResponse(preview.body)) return toRedirect(context, preview.body)
      context.locals.camomilla.page = preview.body
      context.locals.camomilla.page.is_preview = true
      context.locals.camomilla.response = preview.response
      context.locals.camomilla.template_file = preview.body.template_file
      return next()
    }
    // Cookies absent, 403, or page truly missing — fall through to the
    // public path so the caller still gets a sensible response (live page
    // for already-public rows, 404 otherwise).
  }

  const publicResp = await fetch(`${serverUrl}/api/camomilla/pages-router${context.url.pathname}`, {
    headers: extractForwardedHeaders(context, forwardedHeaders)
  })

  context.locals.camomilla.response = publicResp

  if (publicResp.ok) {
    const body = (await publicResp.json()) as CamomillaRouterResponse
    if (isRedirectResponse(body)) return toRedirect(context, body)
    // Back-compat with camomilla < 6.5.0: the old public router served
    // non-public rows at 200 with ``is_public: false`` instead of 404ing
    // them, so without this gate a draft would leak. No-op on 6.5.0+ (which
    // 404s non-public rows server-side, so ``is_public`` is always true
    // here). Skipped when previewing, matching the old behavior where
    // ``?preview=true`` was allowed to see non-public pages.
    if (!previewRequested && body.is_public === false) {
      context.locals.camomilla.response = new Response('Not Public', {
        status: 404,
        statusText: 'Not Public'
      })
      return next()
    }
    context.locals.camomilla.page = body
    context.locals.camomilla.template_file = body.template_file
    return next()
  }

  // Surface error body to the router so it can render a 404 / 5xx template.
  const content = await publicResp.text()
  context.locals.camomilla.error = { content }
  try {
    context.locals.camomilla.error.json = JSON.parse(content)
  } catch (e) {
    console.error(e)
  }

  return next()
}
