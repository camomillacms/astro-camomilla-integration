import { describe, expect, it } from 'vitest'
import {
  serializeResponse,
  deserializeResponse
} from '../../packages/astro-camomilla-integration/src/utils/serializers.ts'

describe('Serializer utils', async () => {
  it('Should serialize and deserialize a response', async () => {
    const response = new Response(JSON.stringify({ message: 'Hello, World!' }), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    })

    const serialized = await serializeResponse(response)
    const deserialized = await deserializeResponse(serialized)

    expect(deserialized.status).toBe(200)
    expect(deserialized.statusText).toBe('OK')
    expect(deserialized.headers.get('Content-Type')).toBe('application/json')
    expect(await deserialized.json()).toEqual({ message: 'Hello, World!' })
  })
})
