import type { AstroSharedContext } from 'astro'
import { isStaff } from '../utils/permissions.ts'
import type { Cacheable, Keyv } from 'cacheable'

async function collectAllCacheKeys(cacheStore: any): Promise<string[]> {
  const keys: Set<string> = new Set<string>()
  if (!cacheStore) {
    return Array.from(keys)
  }
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

async function findKeysForPermalink(cacheStore: any, permalink: string): Promise<string[]> {
  const keys: Set<string> = new Set<string>()
  if (!cacheStore) {
    return Array.from(keys)
  }
  const normalizedPermalink = permalink.startsWith('/') ? permalink : `/${permalink}`

  for (const store of ['primary', 'secondary']) {
    const cache: Keyv = cacheStore[store]
    if (cache && typeof cache.iterator === 'function') {
      for await (const [key] of cache.iterator('*')) {
        // This also captures versions with query parameters
        try {
          const url = new URL(key)
          if (url.pathname === normalizedPermalink || url.pathname.includes(normalizedPermalink)) {
            keys.add(key)
          }
        } catch {
          // If it's not a valid URL, use simple check
          if (key.includes(normalizedPermalink)) {
            keys.add(key)
          }
        }
      }
    }
  }
  return Array.from(keys)
}

export async function GET(context: AstroSharedContext): Promise<Response> {
  context.locals.camomilla?.cache('NEVER_CACHE')
  if (context.locals.camomilla?.user && isStaff(context.locals.camomilla.user)) {
    const cacheStore: Cacheable = context.locals.camomilla.cacheStore
    if (!cacheStore) {
      return new Response(JSON.stringify({ error: 'Cache store not available' }), { status: 500 })
    }
    return new Response(JSON.stringify(await collectAllCacheKeys(cacheStore)), { status: 200 })
  }
  return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
}

export async function POST(context: AstroSharedContext): Promise<Response> {
  context.locals.camomilla?.cache('NEVER_CACHE')
  if (context.locals.camomilla?.user && isStaff(context.locals.camomilla.user)) {
    const cacheStore: Cacheable = context.locals.camomilla.cacheStore

    if (!cacheStore) {
      return new Response(JSON.stringify({ error: 'Cache store not available' }), { status: 500 })
    }

    let body: any = {}
    try {
      const text = await context.request.text()
      if (text.trim()) {
        body = JSON.parse(text)
      }
    } catch {
      console.error('Failed to parse request body as JSON')
    }

    const { keys, permalink } = body

    if (permalink) {
      const keysToDelete = await findKeysForPermalink(cacheStore, permalink)
      if (keysToDelete.length > 0) {
        await cacheStore.deleteMany(keysToDelete)
      }
      return new Response(
        JSON.stringify({
          success: true,
          deletedKeys: keysToDelete,
          deletedCount: keysToDelete.length,
          action: 'delete_permalink'
        }),
        { status: 200 }
      )
    } else if (Array.isArray(keys)) {
      // Checks specific keys
      await cacheStore.deleteMany(keys)
      return new Response(
        JSON.stringify({
          success: true,
          deletedKeys: keys,
          deletedCount: keys.length,
          action: 'delete_specific_keys'
        }),
        { status: 200 }
      )
    } else if (keys === 'ALL') {
      // Explicit clear all
      await cacheStore.clear()
      return new Response(
        JSON.stringify({
          success: true,
          action: 'clear_all'
        }),
        { status: 200 }
      )
    } else {
      return new Response(
        JSON.stringify({
          error:
            'Invalid request body. Use {"permalink": "/path"}, {"keys": ["key1", "key2"]}, or {"keys": "ALL"}'
        }),
        { status: 400 }
      )
    }
  }

  return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 })
}
