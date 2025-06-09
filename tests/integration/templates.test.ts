import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { expect, test } from 'vitest'
import * as Templates from '../../packages/astro-camomilla-integration/src/api/templates.ts'

test('Template Endpoint User not authenticated', async () => {
  const container = await AstroContainer.create()
  const response = await container.renderToResponse(Templates as any, {
    routeType: 'endpoint'
  })
  const json = await response.json()
  expect(json.error).toBe('User not authenticated')
})
