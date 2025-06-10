import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost:8000/api/camomilla/pages-router/*', () => {
    return HttpResponse.json({ message: 'Mocked response from pages-router' })
  }),
  http.get('http://localhost:8000/api/camomilla/users/current/', () => {
    return HttpResponse.json({ is_superuser: true, is_staff: true, is_active: true })
  })
]
