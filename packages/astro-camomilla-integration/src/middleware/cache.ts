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
  if (!cacheEnabled) {
    return next()
  }

  const cacheEngine = getCacheEngine(cacheConfig)

  const cacheKey = buildCacheKey(context, cacheConfig)

  const cached: CachedResponseData | undefined = await cacheEngine.get<CachedResponseData>(cacheKey)

  if (cached) {
    return deserializeResponse(cached)
  }

  const response = await next()

  await cacheEngine.set<CachedResponseData>(cacheKey, await serializeResponse(response.clone()))

  return response
}
