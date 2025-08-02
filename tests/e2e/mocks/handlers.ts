import { http, HttpResponse } from 'msw'

export const handlers = [
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
