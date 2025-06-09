import { expect, test } from 'vitest'
import integration from '../../packages/astro-camomilla-integration/src/index.ts'

test('Init astro camomilla integration', () => {
  const astroCamomillaIntegration = integration({
    server: 'http://localhost:8000',
    autoRouting: true,
    templatesIndex: '../../example/src/templates/index.js',
    stylesIndex: '../../example/src/styles/main.scss'
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
