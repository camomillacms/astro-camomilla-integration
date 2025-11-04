import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import * as CacheFlush from '../../packages/astro-camomilla-integration/src/api/cacheFlush.ts'
import {
  getCacheEngine,
  resetCacheEngine
} from '../../packages/astro-camomilla-integration/src/utils/cacheEngine.ts'

describe('Cache Flush API endpoint', async () => {
  it('Should handle user not authenticated', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: null,
          cache: () => {}
        }
      }
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user not is not staff', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: false,
            is_active: true
          },
          cache: () => {}
        }
      }
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user not is not active', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: false
          },
          cache: () => {}
        }
      }
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })
  it('Should handle user not authenticated', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: null,
          cache: () => {}
        }
      },
      request: new Request('http://localhost/api/cache-flush', {
        method: 'POST',
        body: JSON.stringify({ keys: 'ALL' })
      })
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user is staff', async () => {
    resetCacheEngine()
    const container = await AstroContainer.create()
    const cacheStore = getCacheEngine({ backend: 'redis', location: 'redis://localhost:6379' })
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: false,
            is_staff: true,
            is_active: true
          },
          cache: () => {},
          cacheStore
        }
      }
    })
    const json = await response.json()
    expect(json).toBeInstanceOf(Array)
    resetCacheEngine()
  })
  it('Should handle user is superuser', async () => {
    resetCacheEngine()
    const container = await AstroContainer.create()
    const cacheStore = getCacheEngine({ backend: 'redis', location: 'redis://localhost:6379' })
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: true
          },
          cache: () => {},
          cacheStore
        }
      }
    })
    const json = await response.json()
    expect(json).toBeInstanceOf(Array)
    resetCacheEngine()
  })
  it('Should return cached keys', async () => {
    resetCacheEngine()
    const container = await AstroContainer.create()
    const cacheStore = getCacheEngine({})
    await cacheStore.set('test-key', 'test-value')
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: true
          },
          cache: () => {},
          cacheStore
        }
      }
    })
    const json = await response.json()
    expect(json).toBeInstanceOf(Array)
    expect(json).toContain('test-key')
    resetCacheEngine()
  })
  it('Should flush cache with user authentication', async () => {
    resetCacheEngine()
    const container = await AstroContainer.create()
    const cacheStore = getCacheEngine({})
    await cacheStore.set('test-key', 'test-value')
    expect(await cacheStore.get('test-key')).toBe('test-value')
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: true
          },
          cache: () => {},
          cacheStore
        }
      },
      request: new Request('http://localhost/api/cache-flush', {
        method: 'POST',
        body: JSON.stringify({ keys: 'ALL' }),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': 'csrftokenmock',
          Cookie: 'sessionid=sessionidmock; csrftoken=csrftokenmock'
        }
      })
    })
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(await cacheStore.get('test-key')).toBeUndefined()
    resetCacheEngine()
  })

  it('Should delete precise cache keys with user authentication', async () => {
    resetCacheEngine()
    const container = await AstroContainer.create()
    const cacheStore = getCacheEngine({})
    await cacheStore.set('test-key', 'test-value')
    await cacheStore.set('test-key-2', 'test-value-2')
    expect(await cacheStore.get('test-key')).toBe('test-value')
    const response = await container.renderToResponse(CacheFlush as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: true
          },
          cache: () => {},
          cacheStore
        }
      },
      request: new Request('http://localhost/api/cache-flush', {
        method: 'POST',
        body: JSON.stringify({ keys: ['test-key'] }),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': 'csrftokenmock',
          Cookie: 'sessionid=sessionidmock; csrftoken=csrftokenmock'
        }
      })
    })
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(await cacheStore.get('test-key')).toBeUndefined()
    expect(await cacheStore.get('test-key-2')).toBe('test-value-2')
    resetCacheEngine()
  })
})
