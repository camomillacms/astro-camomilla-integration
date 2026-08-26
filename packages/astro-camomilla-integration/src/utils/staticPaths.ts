import { getIntegrationOptions } from './getIntegrationOptions.ts'

/**
 * ``getStaticPaths`` for the prerendered autoRouting catch-all (static mode).
 *
 * The set of paths to build comes from one of two places:
 *
 * - ``process.env.CAMOMILLA_PATHS`` — a JSON array of public paths. This is
 *   the *incremental* allowlist the ``incremental-build`` CLI computes by
 *   diffing the camomilla content-hash manifest, so Astro renders only the
 *   pages that actually changed.
 * - absent — every public URL from ``pages-router/changes`` (a full build).
 *
 * Each path's page data is fetched from the same public ``pages-router``
 * endpoint the SSR middleware uses and handed to the route as ``props`` — so
 * no middleware needs to run during the static build.
 */

function toParam(path: string): string | undefined {
  // Astro's ``[...path]`` rest param wants the slug without leading/trailing
  // slashes, and ``undefined`` for the site root (``/`` → index.html).
  const p = path.replace(/^\/+|\/+$/g, '')
  return p || undefined
}

async function fetchJson(url: string): Promise<any | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export async function getStaticPaths() {
  const { server } = getIntegrationOptions()
  const allowlist = process.env.CAMOMILLA_PATHS

  let paths: string[]
  if (allowlist) {
    paths = JSON.parse(allowlist)
  } else {
    const body = await fetchJson(`${server}/api/camomilla/pages-router/changes`)
    paths = body?.urls?.map((u: { path: string }) => u.path) ?? []
  }

  const entries = await Promise.all(
    paths.map(async (path) => {
      const page = await fetchJson(`${server}/api/camomilla/pages-router${path}`)
      // Skip pages that vanished and canonical-redirect bodies — redirects are
      // emitted by the deploy step, never built as a page.
      if (!page || page.redirect) {
        console.warn(`[camomilla] static: skipping ${path} (missing or redirect)`)
        return null
      }
      return { params: { path: toParam(path) }, props: { page } }
    })
  )

  return entries.filter(Boolean)
}
