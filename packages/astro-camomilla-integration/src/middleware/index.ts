import type { APIContext, MiddlewareNext } from 'astro'
import { sequence } from 'astro/middleware'
import type { CamomillaHandler } from '../types/camomillaHandler.ts'
import { middlewareCache } from './cache.ts'
import { middlewarePage } from './page.ts'
import { middlewareUser } from './user.ts'

async function middlewareCamomilla(context: APIContext, next: MiddlewareNext) {
  const camomilla: CamomillaHandler = {
    response: null,
    page: null,
    Template: null,
    user: null,
    error: null
  }
  context.locals.camomilla = camomilla
  return next()
}

export const onRequest = sequence(
  middlewareCache,
  middlewareCamomilla,
  middlewarePage,
  middlewareUser
)
