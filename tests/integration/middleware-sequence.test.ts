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
            body: JSON.stringify({ is_public: true })
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
  it('Should handle draft pages', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 200,
            body: JSON.stringify({ is_public: false })
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
  it('Should handle preview draft pages', async () => {
    fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
      switch (true) {
        case req.url.endsWith('/api/camomilla/pages-router/'):
          return {
            status: 200,
            body: JSON.stringify({ is_public: false })
          }
        case req.url.endsWith('/api/camomilla/users/current/'):
          return {
            status: 401,
            body: JSON.stringify({ user: {} })
          }
      }
    })

    const ctxAuthenticated = createMockContext(true)
    ctxAuthenticated.url.searchParams.set('preview', 'true')
    const response = await onRequest(ctxAuthenticated as any, async () => {
      return new Response('Next middleware called')
    })
    if (response instanceof Response)
      expect(ctxAuthenticated.locals.camomilla?.response?.status).toBe(200)
    else throw new Error('Response is not an instance of Response')
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
