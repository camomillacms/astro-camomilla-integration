import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { onRequest } from '../../packages/astro-camomilla-integration/src/utils/middleware.ts'
import { createMockContext } from './helpers/libs.ts'

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
            body: JSON.stringify({})
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
})
