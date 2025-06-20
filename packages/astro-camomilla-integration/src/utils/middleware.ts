import type { MiddlewareNext } from 'astro'
import { sequence } from 'astro/middleware'
import type { CamomillaHandler } from '../types/camomillaHandler.ts'
import type { CamomillaPage } from '../types/camomillaPage.ts'

const { server } = import.meta.env.CAMOMILLA_INTEGRATION_OPTIONS || {
  server: 'http://localhost:8000'
}
const serverUrl = server

async function middlewareCamomilla(context: any, next: MiddlewareNext) {
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

async function middlewarePage(context: any, next: MiddlewareNext) {
  if (
    context.url.pathname.match(
      /^\/(favicon\.ico|robots\.txt|manifest\.json|assets\/|.*\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|otf|mp4|webm|txt|xml|json))$/
    )
  ) {
    return next()
  }

  const resp = await fetch(`${serverUrl}/api/camomilla/pages-router${context.url.pathname}`)
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

async function middlewareUser(context: any, next: MiddlewareNext) {
  const sessionCookie = await context.cookies.get('sessionid')
  const csrfCookie = await context.cookies.get('csrftoken')

  if (sessionCookie && csrfCookie) {
    const resp = await fetch(`${serverUrl}/api/camomilla/users/current/`, {
      headers: {
        Cookie: `sessionid=${sessionCookie.value}; csrftoken=${csrfCookie.value}`,
        'X-CSRFToken': csrfCookie.value
      },
      credentials: 'include'
    })
    if (resp.ok) context.locals.camomilla.user = await resp.json()
  }
  return next()
}

export const onRequest = sequence(middlewareCamomilla, middlewarePage, middlewareUser)
