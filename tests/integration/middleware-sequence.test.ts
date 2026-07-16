import { describe, expect, it, vi } from 'vitest'
import { createMockContext } from './helpers/libs.ts'
import createFetchMock from 'vitest-fetch-mock'
import { extractForwardedHeaders } from '../../packages/astro-camomilla-integration/src/utils/headers.ts'

// Mock the getIntegrationOptions before importing the middleware
vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({
    server: 'http://localhost:8000'
  }))
}))

import { onRequest } from '../../packages/astro-camomilla-integration/src/middleware/index.ts'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

describe('Middleware sequence', async () => {
  it('Should handle next if request is file', async () => {
    const ctxUnauthenticated = createMockContext(false, 'http://localhost', '/pippo.png')
    const response = await onRequest(ctxUnauthenticated as any, async () => {
      return new Response('Next middleware called')
    })

    if (response instanceof Response) expect(response.status).toBe(200)
    else throw new Error('Response is not an instance of Response')
  })

  it('Should handle unauthenticated user', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return {
            status: 401,
            body: JSON.stringify({ user: null, error: 'User not authenticated' })
          }
      }
    })

    const ctxUnauthenticated = createMockContext()
    const response = await onRequest(ctxUnauthenticated as any, async () => {
      return new Response('Next middleware called')
    })

    if (response instanceof Response) expect(response.status).toBe(200)
    else throw new Error('Response is not an instance of Response')
  })

  it('Should handle authenticated user', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 200,
            body: JSON.stringify({ is_public: true, status: 'PUB' })
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return {
            status: 200,
            body: JSON.stringify({ user: {} })
          }
      }
    })

    const ctxAuthenticated = createMockContext(true)
    const response = await onRequest(ctxAuthenticated as any, async () => {
      return new Response('Next middleware called')
    })

    if (response instanceof Response) expect(response.status).toBe(200)
    else throw new Error('Response is not an instance of Response')
  })

  it('Should handle page redirect', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 200,
            body: JSON.stringify({ redirect: '/new-page', status: 301 })
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return {
            status: 401,
            body: JSON.stringify({ user: null, error: 'User not authenticated' })
          }
      }
    })

    const ctxAuthenticated = createMockContext(true)
    const response = await onRequest(ctxAuthenticated as any, async () => {
      return new Response('Next middleware called')
    })

    if (response instanceof Response) expect(response.status).toBe(301)
    else throw new Error('Response is not an instance of Response')
  })

  it('Should extract forwarded headers', () => {
    const ctx = createMockContext()
    ctx.request.headers.set('X-Forwarded-Host', 'example.com')
    ctx.request.headers.set('Referer', 'http://example.com')

    const headers = extractForwardedHeaders(ctx, ['X-Forwarded-Host', 'Referer'])
    expect(headers['X-Forwarded-Host']).toBe('example.com')
    expect(headers['Referer']).toBe('http://example.com')
  })

  // Only the autoRouting catch-all resolves camomilla pages. A local
  // ``src/pages`` route (or an API route) must NOT trigger a pages-router
  // fetch, so ``camomilla.page`` stays unset even when the CMS would answer.
  it('Should skip the pages-router for non-autoRouting routes', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/custom'):
          return { status: 200, body: JSON.stringify({ is_public: true, status: 'PUB' }) }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 401, body: JSON.stringify({ user: null }) }
      }
    })

    const ctx = createMockContext(true, 'http://localhost:8000', '/custom', undefined, '/custom')
    const response = await onRequest(ctx as any, async () => new Response('Next middleware called'))

    expect(response instanceof Response).toBe(true)
    expect(ctx.locals.camomilla.page).toBeFalsy()
  })

  // Camomilla 6.4+: the public ``pages-router`` 404s non-public pages
  // (trashed / draft / scheduled-first-publish) server-side. The integration
  // surfaces the failure response unchanged.
  it('Should handle 404 from server for non-public pages', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 404,
            body: 'Page is not public'
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return {
            status: 401,
            body: JSON.stringify({ user: {} })
          }
      }
    })

    const ctxAuthenticated = createMockContext(true)
    const response = await onRequest(ctxAuthenticated as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response)
      expect(ctxAuthenticated.locals.camomilla?.response?.status).toBe(404)
    else throw new Error('Response is not an instance of Response')
  })

  // ``?preview=true`` without a valid session must NOT bypass the public
  // gate — the lookup/preview call requires the cookies, and skipping it
  // would leak draft state via an anonymous request.
  it('Should not preview without session cookies even with ?preview=true', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return { status: 404, body: 'Page is not public' }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 401, body: JSON.stringify({ user: null }) }
      }
    })

    const ctxAnon = createMockContext(/* authenticated */ false)
    ctxAnon.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxAnon as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) expect(ctxAnon.locals.camomilla?.response?.status).toBe(404)
    else throw new Error('Response is not an instance of Response')
  })

  // Public page + pending draft: ?preview=true must show the OVERLAID
  // version, not the live one. This is the most common preview case —
  // editors checking their pending edits to an already-live page. The
  // middleware goes straight to ``pages-router-preview`` (no public fetch)
  // so the overlay isn't silently dropped.
  it('Should overlay draft on already-public pages when preview is requested', async () => {
    let publicRouterHits = 0
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.includes('/api/camomilla/pages-router/about/'):
          publicRouterHits += 1
          return {
            status: 200,
            body: JSON.stringify({
              id: 7,
              is_public: true,
              status: 'PUB',
              template_file: 'default',
              translations: { en: { title: 'live title' } }
            })
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 200, body: JSON.stringify({ id: 1, is_staff: true }) }
        case req.url.includes('/api/camomilla/pages-router-preview/about/'):
          return {
            status: 200,
            body: JSON.stringify({
              id: 7,
              is_public: true,
              status: 'PUB',
              has_draft: true,
              template_file: 'default',
              translations: { en: { title: 'drafted title' } }
            })
          }
      }
    })

    const ctxStaff = createMockContext(true, 'http://localhost:8000/about/', '/about/')
    ctxStaff.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxStaff as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) {
      expect(ctxStaff.locals.camomilla?.response?.status).toBe(200)
      const page = ctxStaff.locals.camomilla?.page as any
      expect(page?.is_public).toBe(true)
      expect(page?.has_draft).toBe(true)
      // The drafted title wins over the live one.
      expect(page?.translations?.en?.title).toBe('drafted title')
      // Public router must NOT be hit when preview succeeds — single
      // round-trip, no wasted call.
      expect(publicRouterHits).toBe(0)
    } else throw new Error('Response is not an instance of Response')
  })

  // Staff preview path for a non-public page: pages-router-preview returns
  // the page bypassing the is_public gate. Public router never called.
  it('Should handle preview for staff users via the preview router', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.includes('/api/camomilla/pages-router/about/'):
          return { status: 404, body: 'Page is not public' }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 200, body: JSON.stringify({ id: 1, is_staff: true }) }
        case req.url.includes('/api/camomilla/pages-router-preview/about/'):
          return {
            status: 200,
            body: JSON.stringify({
              id: 42,
              is_public: false,
              status: 'DRF',
              has_draft: true,
              template_file: 'default'
            })
          }
      }
    })

    const ctxStaff = createMockContext(true, 'http://localhost:8000/about/', '/about/')
    ctxStaff.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxStaff as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) {
      expect(ctxStaff.locals.camomilla?.response?.status).toBe(200)
      expect((ctxStaff.locals.camomilla?.page as any)?.has_draft).toBe(true)
      // The integration flags every previewed render so consumers (e.g. a
      // preview banner) can key off it even when no draft overlay applies.
      expect((ctxStaff.locals.camomilla?.page as any)?.is_preview).toBe(true)
      expect((ctxStaff.locals.camomilla as any)?.template_file).toBe('default')
    } else throw new Error('Response is not an instance of Response')
  })

  // The preview router can answer a non-canonical permalink with a
  // ``{ redirect, status }`` body just like the public one. The preview
  // path must honor it — not treat it as a page (undefined template_file).
  it('Should honor a canonical redirect from the preview router', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 200, body: JSON.stringify({ id: 1, is_staff: true }) }
        case req.url.includes('/api/camomilla/pages-router-preview/old-about/'):
          return {
            status: 200,
            body: JSON.stringify({ redirect: '/about/', status: 301 })
          }
      }
    })

    const ctxStaff = createMockContext(true, 'http://localhost:8000/old-about/', '/old-about/')
    ctxStaff.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxStaff as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) {
      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toContain('/about/')
    } else throw new Error('Response is not an instance of Response')
  })

  // Regression: a trailing-slash preview URL (``/x/?preview=true``) that
  // canonical-redirects must produce a well-formed Location — origin + the
  // canonical path + the preserved query — not ``/?preview=true/x``.
  it('Should build a well-formed redirect URL and preserve ?preview=true', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 200, body: JSON.stringify({ id: 1, is_staff: true }) }
        case req.url.includes('/api/camomilla/pages-router-preview/news/scheduled-launch/'):
          return {
            status: 200,
            body: JSON.stringify({ redirect: '/news/scheduled-launch', status: 301 })
          }
      }
    })

    const ctxStaff = createMockContext(
      true,
      'http://localhost:8000/news/scheduled-launch/?preview=true',
      '/news/scheduled-launch/'
    )
    ctxStaff.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxStaff as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) {
      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe(
        'http://localhost:8000/news/scheduled-launch?preview=true'
      )
    } else throw new Error('Response is not an instance of Response')
  })

  // ``buildAuthHeaders`` returns ``null`` if either cookie is missing. The
  // sessionid-only case is the typical "logged out partway" state — we
  // must not attempt the preview, just like the cookie-less request.
  it('Should not attempt preview when only one auth cookie is present', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, () => {
      return { status: 404, body: 'Page is not public' }
    })

    const ctx = createMockContext(false)
    // Only sessionid, no csrftoken
    ctx.cookies.set('sessionid', 'mock-session-id')
    ctx.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctx as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) expect(ctx.locals.camomilla?.response?.status).toBe(404)
    else throw new Error('Response is not an instance of Response')
  })

  // If the preview router denies access (e.g. user has cookies but isn't
  // actually staff, so 403), fall back to the public 404.
  it('Should fall back to 404 when the preview router denies access', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return { status: 404, body: 'Page is not public' }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 200, body: JSON.stringify({ id: 1, is_staff: false }) }
        case req.url.includes('/api/camomilla/pages-router-preview/'):
          return { status: 403, body: 'Forbidden' }
      }
    })

    const ctxStaffless = createMockContext(true)
    ctxStaffless.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxStaffless as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response)
      expect(ctxStaffless.locals.camomilla?.response?.status).toBe(404)
    else throw new Error('Response is not an instance of Response')
  })

  // Back-compat with camomilla < 6.5.0: the old public router served
  // non-public rows at 200 with ``is_public: false`` instead of 404ing.
  // The integration must still gate them so drafts don't leak on old servers.
  it('Should 404 a non-public 200 response (old camomilla back-compat)', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return { status: 200, body: JSON.stringify({ is_public: false, status: 0 }) }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 401, body: JSON.stringify({ user: null }) }
      }
    })

    const ctx = createMockContext(false)
    const response = await onRequest(ctx as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) expect(ctx.locals.camomilla?.response?.status).toBe(404)
    else throw new Error('Response is not an instance of Response')
  })

  // …but the back-compat gate must NOT fire on ?preview=true, so previewing
  // a draft still works on old camomilla (where the preview router 404s and
  // we fall through to the public 200 draft).
  it('Should render a non-public preview on old camomilla (gate bypassed)', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.includes('/api/camomilla/pages-router-preview/'):
          return { status: 404, body: 'Not Found' }
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 200,
            body: JSON.stringify({ is_public: false, status: 0, template_file: 'default' })
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return { status: 200, body: JSON.stringify({ id: 1, is_staff: true }) }
      }
    })

    const ctxStaff = createMockContext(true)
    ctxStaff.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxStaff as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) {
      expect(ctxStaff.locals.camomilla?.response?.status).toBe(200)
      expect((ctxStaff.locals.camomilla as any)?.template_file).toBe('default')
    } else throw new Error('Response is not an instance of Response')
  })

  it('Should handle error responses 500', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 500,
            body: 'Internal Server Error'
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return {
            status: 500,
            body: 'Internal Server Error'
          }
      }
    })
    const ctx = createMockContext()
    const response = await onRequest(ctx as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response) expect(ctx.locals.camomilla?.response?.status).toBe(500)
    else throw new Error('Response is not an instance of Response')
  })
})
