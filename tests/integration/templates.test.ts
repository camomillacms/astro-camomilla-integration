import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import * as Templates from '../../packages/astro-camomilla-integration/src/api/templates.ts'

describe('Templates API endpoint', async () => {
  it('Should handle user not authenticated', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(Templates as any, {
      routeType: 'endpoint'
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user is not superuser', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(Templates as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: false,
            is_staff: true,
            is_active: true
          }
        }
      }
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user not is not staff', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(Templates as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: false,
            is_active: true
          }
        }
      }
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user not is not active', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(Templates as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: false
          }
        }
      }
    })
    const json = await response.json()
    expect(json.error).toBe('User not authenticated')
  })

  it('Should handle user authenticated', async () => {
    const container = await AstroContainer.create()
    const response = await container.renderToResponse(Templates as any, {
      routeType: 'endpoint',
      locals: {
        camomilla: {
          user: {
            is_superuser: true,
            is_staff: true,
            is_active: true
          }
        }
      }
    })
    const json = await response.json()
    expect(json).toBeInstanceOf(Array)
  })
})
