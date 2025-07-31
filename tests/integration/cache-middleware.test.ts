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
import { getIntegrationOptions } from '../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions'

describe('Cache middleware', async () => {
  it('Should return response if not cached', async () => {
    const ctx = {
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
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', { headers: { 'User-Agent': 'test-agent' } })
    } as any

    const next = async () => {
      return new Response('Uncached Response', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const cacheEngine = getCacheEngine(getIntegrationOptions().cache)
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
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', { headers: { 'User-Agent': 'test-agent' } })
    } as any

    const next = async () => {
      return new Response('Response from next middleware', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const cacheEngine = getCacheEngine(getIntegrationOptions().cache)
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
})
