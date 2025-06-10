export function createMockContext(
  isAuthenticated = false,
  href: string = 'http://127.0.0.1:8000',
  pathname: string = '/',
  headers: HeadersInit = {}
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
