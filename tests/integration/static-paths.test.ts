import { afterEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({ server: 'http://localhost:8000' }))
}))

import { getStaticPaths } from '../../packages/astro-camomilla-integration/src/utils/staticPaths.ts'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

/** Route the mock: /changes → the manifest; /pages-router/<path> → per-path page. */
function mockCamomilla(opts: {
  changes?: { urls: { path: string }[] } | null
  page?: (path: string) => { status: number; body: string }
}) {
  fetchMocker.mockIf(/.*/, (req) => {
    if (req.url.includes('/pages-router/changes')) {
      return opts.changes === null
        ? { status: 500, body: 'err' }
        : { status: 200, body: JSON.stringify(opts.changes) }
    }
    const path = req.url.replace('http://localhost:8000/api/camomilla/pages-router', '')
    return opts.page ? opts.page(path) : { status: 404, body: '' }
  })
}

const ok = (page: object) => ({ status: 200, body: JSON.stringify(page) })

afterEach(() => {
  delete process.env.CAMOMILLA_PATHS
  fetchMocker.resetMocks()
})

describe('getStaticPaths (static mode)', () => {
  it('allowlist mode: builds only CAMOMILLA_PATHS, mapping root → undefined param', async () => {
    process.env.CAMOMILLA_PATHS = JSON.stringify(['/', '/it/about/'])
    mockCamomilla({ page: (p) => ok({ template_file: 'default', permalink: p }) })

    const paths = await getStaticPaths()
    expect(paths).toHaveLength(2)
    expect(paths[0].params.path).toBeUndefined() // '/' → index.html
    expect(paths[1].params.path).toBe('it/about') // stripped slashes
    expect(paths[1].props.page.template_file).toBe('default')
  })

  it('full mode: no allowlist → every URL from the changes manifest', async () => {
    mockCamomilla({
      changes: { urls: [{ path: '/a/' }, { path: '/b/' }] },
      page: (p) => ok({ template_file: 't', permalink: p })
    })
    const paths = await getStaticPaths()
    expect(paths.map((p) => p.params.path).sort()).toEqual(['a', 'b'])
  })

  it('skips missing pages (non-OK) and canonical-redirect bodies', async () => {
    process.env.CAMOMILLA_PATHS = JSON.stringify(['/gone/', '/redir/', '/ok/'])
    mockCamomilla({
      page: (p) => {
        if (p === '/gone/') return { status: 404, body: '' }
        if (p === '/redir/') return ok({ redirect: '/elsewhere/', status: 301 })
        return ok({ template_file: 't', permalink: p })
      }
    })
    const paths = await getStaticPaths()
    expect(paths).toHaveLength(1)
    expect(paths[0].params.path).toBe('ok')
  })

  it('tolerates an unavailable changes endpoint (returns no paths)', async () => {
    mockCamomilla({ changes: null })
    expect(await getStaticPaths()).toEqual([])
  })
})
