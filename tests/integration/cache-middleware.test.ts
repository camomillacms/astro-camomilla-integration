import { describe, expect, it, vi } from 'vitest'

// Mock the getIntegrationOptions before importing the middleware
vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({
    server: 'http://localhost:8000',
    cache: {
      backend: 'memory',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: ['User-Agent']
    }
  }))
}))

import { middlewareCache } from '../../packages/astro-camomilla-integration/src/middleware/cache'
import {
  getCacheEngine,
  buildCacheKey
} from '../../packages/astro-camomilla-integration/src/utils/cacheEngine'

describe('Cache middleware', async () => {
  it('Should return response if not cached', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', { headers: { 'User-Agent': 'test-agent' } })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    const response = await middlewareCache(ctx, next)
    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(await response.text()).toBe('Response from next middleware')
      expect(response.status).toBe(200)
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })
  it('Should return cached response if available', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', { headers: { 'User-Agent': 'test-agent' } })
    } as any

    const next = async () => {
      return new Response('Uncached Response', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const cacheEngine = getCacheEngine({ backend: 'memory' })
    const cacheKey = buildCacheKey(ctx, { varyOnHeaders: ['User-Agent'] })
    await cacheEngine.set(cacheKey, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Cached response body'
    })

    const response = await middlewareCache(ctx, next)
    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(await response.text()).toBe('Cached response body')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })
  it('Should not hit cache if varyOnHeaders are different', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', { headers: { 'User-Agent': 'test-agent' } })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const cacheEngine = getCacheEngine({ backend: 'memory' })
    const cacheKey = buildCacheKey(ctx, { varyOnHeaders: ['User-Agent'] })
    await cacheEngine.set(cacheKey, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Cached response body'
    })

    // Change the User-Agent header to simulate a different request
    ctx.request.headers.set('User-Agent', 'different-agent')

    const response = await middlewareCache(ctx, next)
    expect(response instanceof Response).toBeTruthy()
    if (response instanceof Response) {
      expect(await response.text()).toBe('Response from next middleware')
    } else {
      throw new Error('Response is not an instance of Response')
    }
  })
  it('Should cache html page responses but not other content types', async () => {
    const cacheEngine = getCacheEngine({ backend: 'memory' })

    const htmlCtx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/html-page'),
      request: new Request('http://localhost/html-page', { headers: { 'User-Agent': 'a' } })
    } as any
    await middlewareCache(htmlCtx, async () => {
      return new Response('<html>page</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      })
    })
    const htmlKey = buildCacheKey(htmlCtx, { varyOnHeaders: ['User-Agent'] })
    const stored: any = await cacheEngine.get(htmlKey)
    expect(stored?.body).toBe('<html>page</html>')

    // An API (JSON) response under a different url must NOT be cached.
    const apiCtx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/api-data'),
      request: new Request('http://localhost/api-data', { headers: { 'User-Agent': 'a' } })
    } as any
    await middlewareCache(apiCtx, async () => {
      return new Response('{"a":1}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    })
    const apiKey = buildCacheKey(apiCtx, { varyOnHeaders: ['User-Agent'] })
    expect(await cacheEngine.get(apiKey)).toBeUndefined()

    // A response with no content-type header is not cached either.
    const noCtCtx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/no-ct'),
      request: new Request('http://localhost/no-ct', { headers: { 'User-Agent': 'a' } })
    } as any
    await middlewareCache(noCtCtx, async () => new Response(null, { status: 200 }))
    const noCtKey = buildCacheKey(noCtCtx, { varyOnHeaders: ['User-Agent'] })
    expect(await cacheEngine.get(noCtKey)).toBeUndefined()
  })

  it('Should not cache non-GET requests even for html responses', async () => {
    const cacheEngine = getCacheEngine({ backend: 'memory' })
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/patch-page'),
      request: new Request('http://localhost/patch-page', {
        method: 'PATCH',
        headers: { 'User-Agent': 'a' }
      })
    } as any
    const response = await middlewareCache(ctx, async () => {
      return new Response('<html>x</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      })
    })
    expect(await response.text()).toBe('<html>x</html>')
    const key = buildCacheKey(ctx, { varyOnHeaders: ['User-Agent'] })
    expect(await cacheEngine.get(key)).toBeUndefined()
  })

  it('Should define locals set cache function', async () => {
    const ctx = {
      locals: { camomilla: {} },
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', { headers: { 'User-Agent': 'test-agent' } })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    await middlewareCache(ctx, next)
    expect(ctx.locals.camomilla.cache).toBeDefined()
    expect(ctx.locals.camomilla.cache(60)).toBeUndefined()
  })
})
