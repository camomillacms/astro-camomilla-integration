export function createMockContext(
  isAuthenticated = false,
  href: string = 'http://localhost:8000',
  pathname: string = '/',
  headers: HeadersInit = {
    'X-Forwarded-Host': 'localhost',
    Referer: 'http://localhost:8000'
  }
) {
  const request = new Request(href, { headers })

  const cookies = new Map()
  if (isAuthenticated) {
    cookies.set('sessionid', 'mock-session-id')
    cookies.set('csrftoken', 'mock-csrf-token')
  }

  return {
    request,
    cookies,
    url: {
      href,
      pathname
    },
    locals: {}
  }
}
