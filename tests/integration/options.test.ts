import { describe, expect, it } from 'vitest'
import { getIntegrationOptions } from '../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions.ts'

describe('Cache engine', async () => {
  it('Should create a cache engine with default config', async () => {
    const options = getIntegrationOptions()
    expect(options).toBeDefined()
  })
})
