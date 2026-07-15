import { http, HttpResponse } from 'msw'

// A page served through the demo *site* templates (SiteLayout → header/footer),
// so an e2e visit exercises the menu components end-to-end.
const SITE_HOME_PAGE = {
  template: 'website/pages/home.html',
  template_file: 'website/pages/home.html',
  is_public: true,
  status: 'PUB',
  title: 'Demo Home',
  alternates: {},
  template_data: {
    hero: { headline: 'Welcome', subheadline: 'Demo home', cta_url: '/about/', cta_label: 'About' }
  }
}

// Menu payload shape returned by the public ``menus-router`` (camomilla 6.5).
const menu = (key: string) => ({
  id: 1,
  key,
  enabled: true,
  nodes: [{ title: 'About', link: { link_type: 'RE', url: '/about/' }, nodes: [] }]
})

export const handlers = [
  http.get('http://localhost:8000/api/camomilla/pages-router/seo', () => {
    return HttpResponse.json({
      template: 'defaults/pages/default',
      template_file: 'defaults/pages/default',
      is_public: true,
      status: 'PUB',
      title: 'Seo Mocked Title',
      description: 'Seo mocked description',
      keywords: 'MockedKey, MockedKey2',
      og_description: 'Seo mocked og_description',
      og_title: 'Seo mocked og_title',
      og_type: 'Seo mocked og_type',
      og_url: 'Seo mocked url',
      canonical: 'Seo mocked canonical',
      og_image: {
        id: 1,
        alt_text: 'Seo mocked og_image alt text',
        title: 'Seo mocked og_image alt text',
        description: 'Seo mocked og_image description',
        file: 'http://seo_mocked_image_path.png',
        thumbnail: 'http://seo_mocked_thumbnail_image_path.png',
        created: '2025-08-05T15:39:42.849206Z',
        size: 100,
        mime_type: 'image/png',
        image_props: { mode: 'RGBA', width: 1024, format: 'PNG', height: 728 },
        folder: null
      }
    })
  }),

  // Camomilla 6.5 gates visibility server-side: the public router 404s a
  // non-public (draft/scheduled/trashed) page.
  http.get('http://localhost:8000/api/camomilla/pages-router/notpublic', () => {
    return new HttpResponse('Page is not public', { status: 404 })
  }),

  // Authenticated preview of that same non-public page: the preview router
  // bypasses the is_public gate and overlays the draft (``has_draft: true``).
  http.get('http://localhost:8000/api/camomilla/pages-router-preview/notpublic', () => {
    return HttpResponse.json({
      template: 'defaults/pages/default',
      template_file: 'defaults/pages/default',
      is_public: false,
      status: 'DRF',
      has_draft: true,
      title: 'Preview Draft Title'
    })
  }),

  // Site-template page used to exercise the menu-driven header/footer.
  http.get('http://localhost:8000/api/camomilla/pages-router/site-home', () => {
    return HttpResponse.json(SITE_HOME_PAGE)
  }),

  // Public menus resolver, keyed by menu key (works anonymously).
  http.get('http://localhost:8000/api/camomilla/menus-router/:key', ({ params }) => {
    return HttpResponse.json(menu(String(params.key)))
  }),

  // djsuperadmin content block, addressed by pk — what the Astro
  // ``/api/djsuperadmin/content/[id]`` route proxies to.
  http.get('http://localhost:8000/api/camomilla/contents/:id/djsuperadmin/', ({ params }) => {
    return HttpResponse.json({ content: `<p>block ${params.id}</p>` })
  }),
  http.patch(
    'http://localhost:8000/api/camomilla/contents/:id/djsuperadmin/',
    async ({ request }) => {
      const body = (await request.json()) as { content?: string }
      return HttpResponse.json({ content: body.content })
    }
  ),

  http.get('http://localhost:8000/api/camomilla/pages-router/*', () => {
    return HttpResponse.json({
      template: 'defaults/pages/default',
      template_file: 'defaults/pages/default',
      is_public: true,
      status: 'PUB'
    })
  }),
  http.get('http://localhost:8000/api/camomilla/users/current/', () => {
    return HttpResponse.json({
      is_superuser: true,
      is_staff: true,
      is_active: true,
      first_name: 'Pippo'
    })
  })
]
