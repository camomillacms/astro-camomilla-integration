export default {}

// The route pattern the integration injects for camomilla autoRouting.
// Shared so the page middleware can tell an autoRouting request apart from
// local ``src/pages`` / API routes via ``context.routePattern``.
export const AUTOROUTING_ROUTE_PATTERN = '/[...path]'
