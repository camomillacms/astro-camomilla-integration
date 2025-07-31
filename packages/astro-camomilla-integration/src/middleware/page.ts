import type { MiddlewareHandler, APIContext, MiddlewareNext } from 'astro'
import { extractForwardedHeaders } from '../utils/headers.ts'
import type { CamomillaPage } from '../types/camomillaPage.ts'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'

/**
 * Middleware to handle page-related requests in the Camomilla integration.
 * It fetches the page data from the Camomilla server based on the request URL.
 */
export const middlewarePage: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext
) => {
  const { server, forwardedHeaders } = getIntegrationOptions()
  const serverUrl = server
  if (
    context.url.pathname.match(
      /^\/(favicon\.ico|robots\.txt|manifest\.json|assets\/|.*\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|otf|mp4|webm|txt|xml|json))$/
    )
  ) {
    return next()
  }

  const resp = await fetch(`${serverUrl}/api/camomilla/pages-router${context.url.pathname}`, {
    headers: extractForwardedHeaders(context, forwardedHeaders)
  })

  context.locals.camomilla.response = resp
  if (resp.ok) {
    const page = await resp.json()
    context.locals.camomilla.page = page
    if (page?.redirect && page.status == 301) {
      const baseUrl = context.url.href.replace(context.url.pathname, '')
      const redirectTo = `${baseUrl}${page.redirect}`
      return Response.redirect(redirectTo, 301)
    }
    const { template_file } = page as CamomillaPage
    context.locals.camomilla.template_file = template_file
  } else {
    context.locals.camomilla.error = await resp.json()
  }
  return next()
}
