import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({ server: 'http://localhost:8000' }))
}))

import { GET } from '../../packages/astro-camomilla-integration/src/api/djsuperadminHistory.ts'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)

const GRANTED = { is_superuser: true, is_staff: true, is_active: true }

function ctx({
  user = GRANTED as any,
  params = {} as Record<string, string>,
  cookie = '',
  search = ''
} = {}) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  return {
    locals: { camomilla: { user } },
    params,
    request: new Request(`http://localhost:4321/api/djsuperadmin/x${search}`, { headers })
  } as any
}

describe('djsuperadmin history proxy', () => {
  beforeEach(() => fetchSpy.mockReset())

  it('401s when there is no user (no backend call)', async () => {
    const res = await GET(ctx({ user: null, params: { id: '1' } }))
    expect(res.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('401s when the user is not a superuser/staff/active', async () => {
    const res = await GET(
      ctx({ user: { is_superuser: true, is_staff: false, is_active: true }, params: { id: '1' } })
    )
    expect(res.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('GET proxies to the backend history endpoint, forwards the cookie, no CSRF', async () => {
    fetchSpy.mockResolvedValue(
      new Response('{"versions":[]}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    const res = await GET(ctx({ params: { id: '42' }, cookie: 'sessionid=s; csrftoken=c' }))

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://localhost:8000/api/camomilla/contents/42/djsuperadmin/history/')
    expect(init.method).toBe('GET')
    expect(init.headers.cookie).toBe('sessionid=s; csrftoken=c')
    expect(init.headers['X-CSRFToken']).toBeUndefined()
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"versions":[]}')
  })

  it('forwards ?language= and drops the bundle cache-buster', async () => {
    fetchSpy.mockResolvedValue(new Response('{"versions":[]}', { status: 200 }))
    await GET(ctx({ params: { id: '42' }, search: '?language=it&cache=99887766' }))
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/camomilla/contents/42/djsuperadmin/history/?language=it'
    )
  })

  it('passes backend error status through, defaulting content-type when absent', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }))
    const res = await GET(ctx({ params: { id: '99' } }))
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toBe('application/json')
  })
})
