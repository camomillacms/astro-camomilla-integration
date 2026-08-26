import { expect, test } from 'vitest'
import integration from '../../packages/astro-camomilla-integration/src/index.ts'

test('Init astro camomilla integration', () => {
  const astroCamomillaIntegration = integration({
    server: 'http://localhost:8000',
    autoRouting: true,
    templatesIndex: '../../example/src/templates/index.js',
    stylesIndex: '../../example/src/styles/main.scss',
    forwardedHeaders: ['X-Forwarded-Host', 'Referer'],
    enableTransitions: false
  })

  expect(astroCamomillaIntegration.name).toBe('astro-camomilla-integration')

  const astroConfigSetup = astroCamomillaIntegration.hooks['astro:config:setup']
  astroConfigSetup?.call(astroCamomillaIntegration, {
    addMiddleware: () => {},
    injectRoute: () => {},
    updateConfig: () => {}
  })
  expect(astroConfigSetup).toBeDefined()

  const astroConfigDone = astroCamomillaIntegration.hooks['astro:config:done']
  astroConfigDone?.call(astroCamomillaIntegration, {
    injectTypes: () => {}
  })
  expect(astroConfigDone).toBeDefined()
})

test('Static mode: prerenders the catch-all and skips the SSR-only surface', () => {
  const routes: any[] = []
  let middlewareAdded = false

  const astroCamomillaIntegration = integration({
    server: 'http://localhost:8000',
    mode: 'static',
    autoRouting: true,
    templatesIndex: '../../example/src/templates/index.js'
  })

  astroCamomillaIntegration.hooks['astro:config:setup']?.call(astroCamomillaIntegration, {
    addMiddleware: () => {
      middlewareAdded = true
    },
    injectRoute: (r: any) => routes.push(r),
    updateConfig: () => {}
  })

  // No SSR runtime in static mode: middleware and the SSR-only API routes
  // (cache-flush, djsuperadmin, /static proxy) must not be injected.
  expect(middlewareAdded).toBe(false)
  expect(routes.every((r) => !String(r.pattern).startsWith('/api/'))).toBe(true)
  expect(routes.some((r) => String(r.pattern).startsWith('/static/'))).toBe(false)

  // The autoRouting catch-all is prerendered via the static route.
  const catchAll = routes.find((r) => r.pattern === '/[...path]')
  expect(catchAll.prerender).toBe(true)
  expect(catchAll.entrypoint).toContain('router-static.astro')
})
