import type { APIContext } from 'astro'
import type { CacheConfig } from '../types/camomillaOptions.ts'
import { Cacheable } from 'cacheable'
import KeyvRedis from '@keyv/redis'
import KeyvValkey from '@keyv/valkey'
import KeyvMemcache from '@keyv/memcache'
import Keyv from 'keyv'

let __cacheEngine: Cacheable | null = null

export function getCacheEngine(config: CacheConfig | boolean): Cacheable {
  const cacheConfig: CacheConfig = {
    backend: (typeof config == 'object' && config.backend) || 'memory',
    location: (typeof config == 'object' && config.location) || undefined,
    ttl: (typeof config == 'object' && config.ttl) || '1h',
    keyPrefix: (typeof config == 'object' && config.keyPrefix) || 'astro-camomilla-cache',
    varyOnHeaders: (typeof config == 'object' && config.varyOnHeaders) || []
  }

  if (__cacheEngine) {
    return __cacheEngine
  }
  switch (cacheConfig.backend) {
    case 'memory':
      __cacheEngine = new Cacheable({
        primary: new Keyv(),
        ttl: cacheConfig.ttl
      })
      break
    case 'redis':
      if (!cacheConfig.location) {
        throw new Error('Redis location must be specified when using Redis as cache backend.')
      }
      __cacheEngine = new Cacheable({
        secondary: new Keyv({
          store: new KeyvRedis(cacheConfig.location)
        }),
        ttl: cacheConfig.ttl
      })
      break
    case 'valkey':
      if (!cacheConfig.location) {
        throw new Error('Valkey location must be specified when using Valkey as cache backend.')
      }
      __cacheEngine = new Cacheable({
        secondary: new KeyvValkey(cacheConfig.location),
        ttl: cacheConfig.ttl
      })
      break
    case 'memcache':
      if (!cacheConfig.location) {
        throw new Error('Memcache location must be specified when using Memcache as cache backend.')
      }
      __cacheEngine = new Cacheable({
        secondary: new KeyvMemcache(cacheConfig.location),
        ttl: cacheConfig.ttl
      })
      break
    default:
      throw new Error(`Invalid cache backend: ${cacheConfig.backend}`)
  }
  return __cacheEngine
}

export function resetCacheEngine() {
  __cacheEngine = null
}

export function buildCacheKey(context: APIContext, cacheConfig: Partial<CacheConfig> = {}): string {
  const validHeaders = cacheConfig.varyOnHeaders?.map((header) => header.toLowerCase()) || []
  const requestHeaders = new Headers(context.request?.headers)
  const headerString = Array.from(requestHeaders.entries())
    .filter(([key]) => validHeaders.includes(key.toLowerCase()))
    .map(([key, value]) => `|${key}:${value}`)
    .join('')
  return `${context.url.href}${headerString}`
}
