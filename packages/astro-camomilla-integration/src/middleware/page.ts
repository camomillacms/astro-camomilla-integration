import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import type { CamomillaPage } from '../types/camomillaPage.ts'
import { getIntegrationOptions } from '../utils/getIntegrationOptions.ts'
import { extractForwardedHeaders } from '../utils/headers.ts'

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

  try {
    const response = await fetch(`${serverUrl}/api/camomilla/pages-router${context.url.pathname}`, {
      headers: extractForwardedHeaders(context, forwardedHeaders)
    })

    if (!response.ok) {
      throw new Error(`Camomilla response status: ${response.status}`)
    }

    context.locals.camomilla.response = response

    let page

    try {
      page = await response.json()
    } catch {
      throw new Error('Camomilla response is not json')
    }

    context.locals.camomilla.page = page

    if (page?.redirect && page.status == 301) {
      const baseUrl = context.url.href.replace(context.url.pathname, '')
      const redirectTo = `${baseUrl}${page.redirect}`
      return Response.redirect(redirectTo, 301)
    }

    const preview = context.url.searchParams?.get('preview')

    if (page.is_public || preview === 'true') {
      const { template_file } = page as CamomillaPage
      context.locals.camomilla.template_file = template_file
    } else {
      context.locals.camomilla.response = new Response(page, {
        status: 404,
        statusText: 'Not Public',
        headers: response.headers
      })
    }
  } catch (error: { message: string } | any) {
    context.locals.camomilla.error = error.message
  }

  return next()
}
