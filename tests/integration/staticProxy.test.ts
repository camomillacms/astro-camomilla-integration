import { describe, expect, it, vi, beforeEach } from 'vitest'

const getOptions = vi.hoisted(() => vi.fn())
vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: getOptions
}))

import { GET } from '../../packages/astro-camomilla-integration/src/api/staticProxy.ts'

const fetchSpy = vi.fn()
vi.stubGlobal('fetch', fetchSpy)

const ctx = (path: string) => ({ params: { path } }) as any

beforeEach(() => {
  fetchSpy.mockReset()
  getOptions.mockReturnValue({ server: 'http://localhost:8000', staticProxy: true })
})

describe('static proxy', () => {
  it('proxies a path under /static, passing content-type + cache-control through', async () => {
    fetchSpy.mockResolvedValue(
      new Response('/* js */', {
        status: 200,
        headers: { 'content-type': 'text/javascript', 'cache-control': 'max-age=60' }
      })
    )
    const res = await GET(ctx('djsuperadmin/djsuperadmin.bundle.js'))

    expect(fetchSpy.mock.calls[0][0].href).toBe(
      'http://localhost:8000/static/djsuperadmin/djsuperadmin.bundle.js'
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/javascript')
    expect(res.headers.get('cache-control')).toBe('max-age=60')
  })

  it('defaults content-type/cache-control and passes backend status through', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }))
    const res = await GET(ctx('missing.js'))
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
  })

  it('rejects path traversal escaping /static without hitting the backend', async () => {
    const res = await GET(ctx('../api/camomilla/secret'))
    expect(res.status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not let a scheme in the path become an SSRF target', async () => {
    // `static/http://evil.com` stays a path segment -> still under /static.
    fetchSpy.mockResolvedValue(new Response(null, { status: 404 }))
    await GET(ctx('http://evil.com/x'))
    expect(fetchSpy.mock.calls[0][0].href).toBe('http://localhost:8000/static/http://evil.com/x')
  })

  it('allow-list: proxies matching prefixes, 404s the rest', async () => {
    getOptions.mockReturnValue({
      server: 'http://localhost:8000',
      staticProxy: { allow: ['djsuperadmin/'] }
    })
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    await GET(ctx('djsuperadmin/djsuperadmin.bundle.js'))
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const res = await GET(ctx('media/private.pdf'))
    expect(res.status).toBe(404)
    expect(fetchSpy).toHaveBeenCalledTimes(1) // no extra backend call
  })

  it('deny-list: blocks matching prefixes, proxies the rest', async () => {
    getOptions.mockReturnValue({
      server: 'http://localhost:8000',
      staticProxy: { deny: ['media/'] }
    })
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))

    const blocked = await GET(ctx('media/private.pdf'))
    expect(blocked.status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()

    await GET(ctx('djsuperadmin/djsuperadmin.bundle.js'))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('staticProxy=false blocks even if the handler is reached directly', async () => {
    getOptions.mockReturnValue({ server: 'http://localhost:8000', staticProxy: false })
    const res = await GET(ctx('djsuperadmin/djsuperadmin.bundle.js'))
    expect(res.status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('proxies when staticProxy is unset (defaults to on)', async () => {
    getOptions.mockReturnValue({ server: 'http://localhost:8000' })
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))
    await GET(ctx('djsuperadmin/djsuperadmin.bundle.js'))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('treats a missing path param as the /static/ root', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }))
    await GET({ params: {} } as any)
    expect(fetchSpy.mock.calls[0][0].href).toBe('http://localhost:8000/static/')
  })
})
