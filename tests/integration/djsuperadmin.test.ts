import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({ server: 'http://localhost:8000' }))
}))

import { GET, PATCH } from '../../packages/astro-camomilla-integration/src/api/djsuperadmin.ts'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)

const GRANTED = { is_superuser: true, is_staff: true, is_active: true }

// Minimal AstroSharedContext stand-in: the proxy only touches
// ``locals.camomilla.user``, ``params``, and ``request`` (cookie + body).
function ctx({
  user = GRANTED as any,
  params = {} as Record<string, string>,
  cookie = '',
  body = '',
  search = ''
} = {}) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  const init: RequestInit = { headers }
  if (body) {
    init.method = 'POST'
    init.body = body
  }
  return {
    locals: { camomilla: { user } },
    params,
    request: new Request(`http://localhost:4321/api/djsuperadmin/x${search}`, init)
  } as any
}

describe('djsuperadmin proxy', () => {
  beforeEach(() => fetchSpy.mockReset())

  it('401s when there is no user (no backend call)', async () => {
    const res = await GET(ctx({ user: null, params: { id: '1' } }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('User not authenticated')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('401s when the user is not a superuser/staff/active', async () => {
    const res = await GET(
      ctx({ user: { is_superuser: true, is_staff: false, is_active: true }, params: { id: '1' } })
    )
    expect(res.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('GET proxies a page-scoped block by id, forwards the cookie, no CSRF', async () => {
    fetchSpy.mockResolvedValue(
      new Response('{"content":"hi"}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    const res = await GET(ctx({ params: { id: '42' }, cookie: 'sessionid=s; csrftoken=c' }))

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/camomilla/contents/42/djsuperadmin/')
    expect(init.method).toBe('GET')
    expect(init.headers.cookie).toBe('sessionid=s; csrftoken=c')
    expect(init.headers['X-CSRFToken']).toBeUndefined()
    expect(init.body).toBeUndefined()
    // Backend response is passed through unchanged.
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"content":"hi"}')
    expect(res.headers.get('content-type')).toBe('application/json')
  })

  it('PATCH forwards the CSRF token (read from the cookie) and the request body', async () => {
    fetchSpy.mockResolvedValue(new Response('{"content":"new"}', { status: 200 }))
    const res = await PATCH(
      ctx({ params: { id: '42' }, cookie: 'sessionid=s; csrftoken=tok', body: '{"content":"new"}' })
    )

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/camomilla/contents/42/djsuperadmin/')
    expect(init.method).toBe('PATCH')
    expect(init.headers['X-CSRFToken']).toBe('tok')
    expect(init.body).toBe('{"content":"new"}')
    expect(res.status).toBe(200)
  })

  it('sends an empty CSRF token when the cookie has none', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
    await PATCH(ctx({ params: { id: '1' }, cookie: 'sessionid=s', body: '{}' }))
    expect(fetchSpy.mock.calls[0][1].headers['X-CSRFToken']).toBe('')
  })

  it('URL-encodes the id into the backend URL', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
    await GET(ctx({ params: { id: 'a b' } }))
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents/a%20b/djsuperadmin/'
    )
  })

  it('falls back to an empty id segment when the param is missing', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
    await GET(ctx({ params: {} }))
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents//djsuperadmin/'
    )
  })

  it('forwards ?language= from the request so edits hit the right column', async () => {
    fetchSpy.mockResolvedValue(new Response('{"content":"ciao"}', { status: 200 }))
    await GET(ctx({ params: { id: '42' }, search: '?language=it' }))
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents/42/djsuperadmin/?language=it'
    )
  })

  it('PATCH scopes the write to the language too', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
    await PATCH(
      ctx({ params: { id: '42' }, search: '?language=en', cookie: 'csrftoken=t', body: '{}' })
    )
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents/42/djsuperadmin/?language=en'
    )
  })

  it('drops the bundle cache-buster, forwarding only ?language=', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
    await GET(ctx({ params: { id: '42' }, search: '?language=it&cache=99887766' }))
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents/42/djsuperadmin/?language=it'
    )
  })

  it('omits ?language= when the request has none', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }))
    await GET(ctx({ params: { id: '7' } }))
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents/7/djsuperadmin/'
    )
  })

  it('passes backend error status through, defaulting content-type when absent', async () => {
    // ``new Response(null)`` carries no content-type, exercising the fallback.
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }))
    const res = await GET(ctx({ params: { id: '99' } }))
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toBe('application/json')
  })
})
