import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost:8000/api/camomilla/pages-router/seo', () => {
    return HttpResponse.json({
      template: 'defaults/pages/default',
      template_file: 'defaults/pages/default',
      is_public: true,
      title: 'Seo Mocked Title',
      description: 'Seo mocked description',
      keywords: ['MockedKey', 'MockedKey2'],
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
  http.get('http://localhost:8000/api/camomilla/pages-router/*', () => {
    return HttpResponse.json({
      template: 'defaults/pages/default',
      template_file: 'defaults/pages/default',
      is_public: true
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
