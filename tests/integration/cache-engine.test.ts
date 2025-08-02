import { describe, expect, it } from 'vitest'
import {
  buildCacheKey,
  getCacheEngine,
  resetCacheEngine
} from '../../packages/astro-camomilla-integration/src/utils/cacheEngine.ts'

describe('Cache engine', async () => {
  it('Should create a cache engine with default config', async () => {
    resetCacheEngine()
    const cacheEngine = getCacheEngine({})
    expect(cacheEngine).toBeDefined()
  })
  it('Should create a cache engine with Redis config', async () => {
    resetCacheEngine()
    const cacheEngine = getCacheEngine({
      backend: 'redis',
      location: 'redis://localhost:6379',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: []
    })
    expect(cacheEngine).toBeDefined()
  })
  it('Should throw error if Redis location is not specified', async () => {
    resetCacheEngine()
    expect(() => {
      getCacheEngine({
        backend: 'redis',
        ttl: '1h',
        keyPrefix: 'astro-camomilla-cache',
        varyOnHeaders: []
      })
    }).toThrow('Redis location must be specified when using Redis as cache backend.')
  })
  it('Should create a cache engine with Valkey config', async () => {
    resetCacheEngine()
    const cacheEngine = getCacheEngine({
      backend: 'valkey',
      location: 'valkey://localhost:6379',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: []
    })
    expect(cacheEngine).toBeDefined()
  })
  it('Should throw error if Valkey location is not specified', async () => {
    resetCacheEngine()
    expect(() => {
      getCacheEngine({
        backend: 'valkey',
        ttl: '1h',
        keyPrefix: 'astro-camomilla-cache',
        varyOnHeaders: []
      })
    }).toThrow('Valkey location must be specified when using Valkey as cache backend.')
  })
  it('Should create a cache engine with Memcache config', async () => {
    resetCacheEngine()
    const cacheEngine = getCacheEngine({
      backend: 'memcache',
      location: 'memcache://localhost:11211',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: []
    })
    expect(cacheEngine).toBeDefined()
  })
  it('Should throw error if Memcache location is not specified', async () => {
    resetCacheEngine()
    expect(() => {
      getCacheEngine({
        backend: 'memcache',
        ttl: '1h',
        keyPrefix: 'astro-camomilla-cache',
        varyOnHeaders: []
      })
    }).toThrow('Memcache location must be specified when using Memcache as cache backend.')
  })
  it('Should throw error if invalid cache backend is specified', async () => {
    resetCacheEngine()
    expect(() => {
      getCacheEngine({
        backend: 'invalid-backend',
        ttl: '1h',
        keyPrefix: 'astro-camomilla-cache',
        varyOnHeaders: []
      })
    }).toThrow('Invalid cache backend: invalid-backend')
  })
  it('Should get cache engine as a singleton', async () => {
    resetCacheEngine()
    const cacheEngine1 = getCacheEngine({
      backend: 'memory',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: []
    })
    const cacheEngine2 = getCacheEngine({
      backend: 'memory',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: []
    })
    expect(cacheEngine1).toBe(cacheEngine2)
  })
  it('Should build cache key consistently', async () => {
    const ctx = {
      url: new URL('http://localhost/test'),
      request: new Request('http://localhost/test', {
        headers: { Cookie: 'session=abc123; other=def456;', 'User-Agent': 'test-agent' }
      })
    } as any
    expect(buildCacheKey(ctx, { varyOnHeaders: ['User-Agent'] })).toBe(
      'http://localhost/test|user-agent:test-agent'
    )
    expect(buildCacheKey(ctx, { varyOnHeaders: ['Cookie', 'User-Agent'] })).toBe(
      'http://localhost/test|cookie:session=abc123;other=def456;|user-agent:test-agent'
    )
    expect(buildCacheKey(ctx, { varyOnHeaders: [] })).toBe('http://localhost/test')
    expect(buildCacheKey(ctx, { varyOnHeaders: ['Accept'] })).toBe('http://localhost/test')
    expect(buildCacheKey(ctx)).toBe('http://localhost/test')
  })
  it('Should handle cache hit', async () => {
    resetCacheEngine()
    const cacheEngine = getCacheEngine({
      backend: 'memory',
      ttl: '1h',
      keyPrefix: 'astro-camomilla-cache',
      varyOnHeaders: []
    })
    await cacheEngine.set('test-key', { data: 'cached data' })
    const cachedResponse = await cacheEngine.get('test-key')
    expect(cachedResponse).toEqual({ data: 'cached data' })
  })
})
