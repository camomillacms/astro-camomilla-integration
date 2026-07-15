/**
 * Page lifecycle label, derived server-side from ``published_at`` /
 * ``deleted_at`` + the Draft table. Returned on every page-shaped response
 * from ``/api/camomilla/pages-router`` and ``/api/camomilla/pages/<id>/``.
 *
 * - ``PUB`` published & publicly visible
 * - ``DRF`` draft (never published in the active language)
 * - ``PLA`` scheduled (legacy: ``published_at`` in the future)
 * - ``TRS`` trashed (soft-deleted globally)
 */
export type CamomillaPageStatus = 'PUB' | 'DRF' | 'PLA' | 'TRS'

export interface CamomillaPage {
  id: number
  is_public: boolean
  status: CamomillaPageStatus
  /**
   * Present only on the authenticated preview response
   * (``/api/camomilla/pages/<id>/preview/``). The public router omits these
   * by design so it can't leak draft presence.
   */
  has_draft?: boolean
  has_scheduled_draft?: boolean
  /**
   * Set by the integration (not the server) when this page was resolved
   * through the authenticated preview router. Reliable "we're rendering a
   * preview" signal — true for every previewed state, including a non-public
   * page with no pending Draft (where ``has_draft`` is false).
   */
  is_preview?: boolean
  indexable: boolean
  alternates: Record<string, string | null>
  permalink: string
  language?: string
  related_name: string
  translations: Record<string, CamomillaPage>
  breadcrumbs: {
    permalink: string
    title: string
  }[]
  routerlink: string
  template_file: string
  title: string | null
  description: string | null
  og_description: string | null
  og_title: string | null
  og_type: string | null
  og_url: string | null
  canonical: string | null
  meta: Record<string, unknown>
  identifier: string
  date_created: string
  date_updated_at: string
  breadcrumbs_title: string | null
  template: string
  template_data: Record<string, unknown>
  ordering: number
  content_type?: number
  contents?: Record<string, { id: number; content: string }>
  /**
   * Timestamp at which the active language's content went / will go public.
   * ``null`` means the language has never been published. Replaced the old
   * ``publication_date`` field — the lifecycle column was removed in camomilla
   * 6.4+ and ``published_at`` is now the single source of truth (per language).
   */
  published_at: string | null
  autopermalink: boolean
  og_image: string | null
  parent_page: string | null
  url_node: {
    id: number
    permalink: string
    related_name: string
  }
}

/**
 * Body shape returned by ``pages-router`` when the requested permalink
 * matches a ``UrlRedirect`` row. Disjoint from ``CamomillaPage`` — the
 * router emits one or the other.
 */
export interface CamomillaRedirect {
  redirect: string
  status: number
}

export type CamomillaRouterResponse = CamomillaPage | CamomillaRedirect

export function isRedirectResponse(value: CamomillaRouterResponse): value is CamomillaRedirect {
  return typeof (value as CamomillaRedirect).redirect === 'string'
}
