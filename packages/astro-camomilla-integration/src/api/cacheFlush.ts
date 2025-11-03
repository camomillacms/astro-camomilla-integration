import type { AstroSharedContext } from 'astro'
import { isStaff } from '../utils/permissions.ts'
import type { Cacheable, Keyv } from 'cacheable'

async function collectAllCacheKeys(cacheStore: any): Promise<string[]> {
  const keys: Set<string> = new Set<string>()
  for (const store of ['primary', 'secondary']) {
    const cache: Keyv = cacheStore[store]
    if (cache && typeof cache.iterator === 'function') {
      for await (const [key] of cache.iterator('*')) {
        keys.add(key)
      }
    }
  }
  return Array.from(keys)
}

export async function GET(context: AstroSharedContext): Promise<Response> {
  context.locals.camomilla?.cache('NEVER_CACHE')
  if (context.locals.camomilla?.user && isStaff(context.locals.camomilla.user)) {
    const cacheStore: Cacheable = context.locals.camomilla.cacheStore
    return new Response(JSON.stringify(await collectAllCacheKeys(cacheStore)), { status: 200 })
  }
  return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
}

export async function POST(context: AstroSharedContext): Promise<Response> {
  context.locals.camomilla?.cache('NEVER_CACHE')
  if (context.locals.camomilla?.user && isStaff(context.locals.camomilla.user)) {
    const { keys } = await context.request.json()
    const cacheStore: Cacheable = context.locals.camomilla.cacheStore
    if (Array.isArray(keys)) {
      await cacheStore.deleteMany(keys)
    } else if (keys === 'ALL') {
      await cacheStore.clear()
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }

  return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
}
