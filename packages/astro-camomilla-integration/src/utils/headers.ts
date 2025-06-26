export function extractForwardedHeaders(
  context: any,
  forwardedHeaders: string[] = []
): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const header of forwardedHeaders) {
    const value = context.request.headers.get(header)
    if (value) {
      headers[header] = value
    }
  }
  return headers
}
