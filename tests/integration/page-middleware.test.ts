import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

// Mock the getIntegrationOptions before importing the middleware
vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({
    server: 'http://localhost:8000'
  }))
}))

import { middlewarePage } from '../../packages/astro-camomilla-integration/src/middleware/page'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

fetchMocker.mockIf(/^http?:\/\/localhost:8000.*$/, (req) => {
  switch (true) {
    case req.url.endsWith('pages-router-ok'):
      return {
        status: 200,
        body: JSON.stringify({ message: 'Page router ok', is_public: true })
      }
    case req.url.endsWith('pages-router-redirect'):
      return {
        status: 200,
        body: JSON.stringify({ status: 301, redirect: true, message: 'Page router redirect' })
      }
    case req.url.endsWith('pages-router-not-found'):
      return {
        status: 200,
        body: JSON.stringify({ message: 'Page router not found', is_public: false })
      }
    case req.url.endsWith('pages-router-success-html'):
      return {
        status: 200,
        body: '<html><body>Ok</body></html>'
      }
    case req.url.endsWith('pages-router-error-json'):
      return {
        status: 500,
        body: JSON.stringify({ error: 'Page router error json' })
      }
    case req.url.endsWith('pages-router-error-html'):
      return {
        status: 500,
        body: '<html><body>Page router error html</body></html>'
      }
  }
})

describe('Page middleware', async () => {
  it('Should handle page router response ok', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/pages-router-ok'),
      request: new Request('http://localhost/pages-router-ok', {
        headers: { 'User-Agent': 'test-agent' }
      })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const response = await middlewarePage(ctx, next)

    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(await response.text()).toBe('Response from next middleware')
      expect(response.status).toBe(200)
      expect(ctx.locals.camomilla.page.message).toBe('Page router ok')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })

  it('Should handle page router response redirect', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/pages-router-redirect'),
      request: new Request('http://localhost/pages-router-redirect', {
        headers: { 'User-Agent': 'test-agent' }
      })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const response = await middlewarePage(ctx, next)

    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(response.status).toBe(301)
      expect(ctx.locals.camomilla.page.message).toBe('Page router redirect')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })

  it('Should handle page router response not found', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/pages-router-not-found'),
      request: new Request('http://localhost/pages-router-not-found', {
        headers: { 'User-Agent': 'test-agent' }
      })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const response = await middlewarePage(ctx, next)

    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(response.status).toBe(200)
      expect(ctx.locals.camomilla.page.message).toBe('Page router not found')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })

  it('Should handle page router response html', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/pages-router-success-html'),
      request: new Request('http://localhost/pages-router-success-html', {
        headers: { 'User-Agent': 'test-agent' }
      })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const response = await middlewarePage(ctx, next)

    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(await response.text()).toBe('Response from next middleware')
      expect(response.status).toBe(200)
      expect(ctx.locals.camomilla.error).toStrictEqual('Camomilla response is not json')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })

  it('Should handle page router response error json', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/pages-router-error-json'),
      request: new Request('http://localhost/pages-router-error-json', {
        headers: { 'User-Agent': 'test-agent' }
      })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const response = await middlewarePage(ctx, next)

    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(response.status).toBe(200)
      expect(ctx.locals.camomilla.error).toStrictEqual('Camomilla response status: 500')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })

  it('Should handle page router response error html', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/pages-router-error-html'),
      request: new Request('http://localhost/pages-router-error-html', {
        headers: { 'User-Agent': 'test-agent' }
      })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const response = await middlewarePage(ctx, next)

    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(await response.text()).toBe('Response from next middleware')
      expect(response.status).toBe(200)
      expect(ctx.locals.camomilla.error).toStrictEqual('Camomilla response status: 500')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })
})
