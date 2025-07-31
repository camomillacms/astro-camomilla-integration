import type { MiddlewareHandler, APIContext, MiddlewareNext } from 'astro'
import { extractForwardedHeaders } from '../utils/headers.ts'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'

/**
 * Middleware to handle user-related requests in the Camomilla integration.
 * It fetches the current user from the Camomilla server if session cookies are present.
 */
export const middlewareUser: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext
) => {
  const { server, forwardedHeaders } = getIntegrationOptions()
  const serverUrl = server
  const sessionCookie = await context.cookies.get('sessionid')
  const csrfCookie = await context.cookies.get('csrftoken')

  if (sessionCookie && csrfCookie) {
    const resp = await fetch(`${serverUrl}/api/camomilla/users/current/`, {
      headers: {
        ...extractForwardedHeaders(context, forwardedHeaders),
        Cookie: `sessionid=${sessionCookie.value}; csrftoken=${csrfCookie.value}`,
        'X-CSRFToken': csrfCookie.value
      },
      credentials: 'include'
    })
    if (resp.ok) context.locals.camomilla.user = await resp.json()
  }
  return next()
}
