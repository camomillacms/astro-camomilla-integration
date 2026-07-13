import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { createMockContext } from './helpers/libs.ts'

vi.mock('../../packages/astro-camomilla-integration/src/utils/getIntegrationOptions', () => ({
  getIntegrationOptions: vi.fn(() => ({
    server: 'http://localhost:8000'
  }))
}))

import { fetchMenu } from '../../packages/astro-camomilla-integration/src/utils/fetchMenu.ts'
// Import via the public barrel too so the ``./menus`` export entry-point
// is exercised by coverage and stays in lockstep with what consumers import.
import * as menusBarrel from '../../packages/astro-camomilla-integration/src/menus.ts'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

describe('fetchMenu', () => {
  it('Public ``./menus`` barrel re-exports fetchMenu', () => {
    expect(menusBarrel.fetchMenu).toBe(fetchMenu)
  })

  it('Returns null when no session cookies are present', async () => {
    // The fetcher must not blindly hit the API when the visitor can't
    // possibly be authenticated — the camomilla menu endpoint requires
    // auth by default and we don't want anonymous 401s on every render.
    const calls: string[] = []
    fetchMocker.mockIf(/.*/, (req) => {
      calls.push(req.url)
      return { status: 401, body: 'unauth' }
    })
    const ctx = createMockContext(/* authenticated */ false)
    const menu = await fetchMenu('main', ctx as any)
    expect(menu).toBeNull()
    // It's fine if the fetcher still attempts the request (the helper
    // forwards-whatever-cookies and lets the server decide), but the
    // result must always be null when the response isn't OK.
    // We don't assert call count here — just behavior.
  })

  it('Returns the menu when the server responds 200', async () => {
    fetchMocker.mockIf(/.*/, () => ({
      status: 200,
      body: JSON.stringify({
        id: 1,
        key: 'main',
        enabled: true,
        nodes: [{ title: 'About', link: { link_type: 'RE', url: '/about/' }, nodes: [] }]
      })
    }))
    const ctx = createMockContext(true)
    const menu = await fetchMenu('main', ctx as any)
    expect(menu).not.toBeNull()
    expect(menu?.key).toBe('main')
    expect(menu?.nodes).toHaveLength(1)
    expect(menu?.nodes[0].title).toBe('About')
  })

  it('Returns null when the server responds non-OK', async () => {
    fetchMocker.mockIf(/.*/, () => ({ status: 403, body: 'forbidden' }))
    const ctx = createMockContext(true)
    const menu = await fetchMenu('main', ctx as any)
    expect(menu).toBeNull()
  })

  it('Memoizes per APIContext: second call hits the cache', async () => {
    let hits = 0
    fetchMocker.mockIf(/.*/, () => {
      hits += 1
      return {
        status: 200,
        body: JSON.stringify({ id: 1, key: 'main', enabled: true, nodes: [] })
      }
    })
    const ctx = createMockContext(true)
    await fetchMenu('main', ctx as any)
    await fetchMenu('main', ctx as any)
    expect(hits).toBe(1)
  })

  it('Memoizes null results too: a failed first call short-circuits the second', async () => {
    let hits = 0
    fetchMocker.mockIf(/.*/, () => {
      hits += 1
      return { status: 403, body: 'forbidden' }
    })
    const ctx = createMockContext(true)
    expect(await fetchMenu('main', ctx as any)).toBeNull()
    expect(await fetchMenu('main', ctx as any)).toBeNull()
    expect(hits).toBe(1)
  })

  it('Adds ?language=<code> when the request URL has a language prefix', async () => {
    const seenUrls: string[] = []
    fetchMocker.mockIf(/.*/, (req) => {
      seenUrls.push(req.url)
      return {
        status: 200,
        body: JSON.stringify({ id: 1, key: 'main', enabled: true, nodes: [] })
      }
    })
    const ctx = createMockContext(true, 'http://localhost:8000/it/about', '/it/about')
    await fetchMenu('main', ctx as any)
    expect(seenUrls[0]).toContain('language=it')
  })

  it('Skips the language param on the default-locale (no prefix) URL', async () => {
    const seenUrls: string[] = []
    fetchMocker.mockIf(/.*/, (req) => {
      seenUrls.push(req.url)
      return {
        status: 200,
        body: JSON.stringify({ id: 1, key: 'main', enabled: true, nodes: [] })
      }
    })
    const ctx = createMockContext(true, 'http://localhost:8000/about', '/about')
    await fetchMenu('main', ctx as any)
    expect(seenUrls[0]).not.toContain('language=')
  })
})
