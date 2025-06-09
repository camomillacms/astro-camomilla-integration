import { expect, test } from 'vitest'
import { loadTemplate } from '../../packages/astro-camomilla-integration/src/utils/loadTemplate.ts'

test('Load default template', async () => {
  const template = await loadTemplate(undefined, {
    template1: () => {},
    template2: () => {}
  })
  expect(typeof template).toBe('function')
  expect(template.name).toBe('default')
})

test('Load template from available options', async () => {
  const template = await loadTemplate('template1', {
    template1: () => {},
    template2: () => {}
  })
  expect(typeof template).toBe('function')
  expect(template.name).toBe('template1')
})
