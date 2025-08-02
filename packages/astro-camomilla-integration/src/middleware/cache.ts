import type { MiddlewareHandler, APIContext, MiddlewareNext } from 'astro'
import type { CachedResponseData } from '../types/cachedResponse.ts'
import { deserializeResponse, serializeResponse } from '../utils/serializers.ts'
import { getCacheEngine, buildCacheKey } from '../utils/cacheEngine.ts'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'

const cacheConfig = getIntegrationOptions().cache

const cacheEnabled = !!cacheConfig

export const middlewareCache: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext
) => {
  let ttl: number | string | undefined

  context.locals.camomilla.cache = (seconds: number | 'NEVER_CACHE') => {
    ttl = seconds
  }

  if (!cacheEnabled) {
    return next()
  }

  context.locals.camomilla.cacheStore = getCacheEngine(cacheConfig)

  const cacheKey = buildCacheKey(context, cacheConfig)

  const cached: CachedResponseData | undefined =
    await context.locals.camomilla.cacheStore.get<CachedResponseData>(cacheKey)

  if (cached) {
    return deserializeResponse(cached)
  }

  const response = await next()

  if (ttl !== 'NEVER_CACHE') {
    await context.locals.camomilla.cacheStore.set<CachedResponseData>(
      cacheKey,
      await serializeResponse(response.clone()),
      ttl || undefined
    )
  }

  return response
}
