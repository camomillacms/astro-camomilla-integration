import { describe, expect, it } from 'vitest'
import { loadTemplate } from '../../packages/astro-camomilla-integration/src/utils/loadTemplate.ts'

describe('Load template', async () => {
  it('Should load default template', async () => {
    const template = await loadTemplate(undefined, {
      template1: () => {},
      template2: () => {}
    })
    expect(typeof template).toBe('function')
    expect(template.name).toBe('default')
  })

  it('Should load template from available options', async () => {
    const template = await loadTemplate('template1', {
      template1: () => {},
      template2: () => {}
    })
    expect(typeof template).toBe('function')
    expect(template.name).toBe('template1')
  })
})
