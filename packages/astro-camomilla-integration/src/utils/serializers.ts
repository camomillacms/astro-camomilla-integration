import type { CachedResponseData } from '../types/cachedResponse.ts'

export async function serializeResponse(response: Response): Promise<CachedResponseData> {
  const body = await response.text()
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return {
    body,
    status: response.status,
    statusText: response.statusText,
    headers
  }
}

export function deserializeResponse(data: CachedResponseData): Response {
  return new Response(data.body, {
    status: data.status,
    statusText: data.statusText,
    headers: data.headers
  })
}
