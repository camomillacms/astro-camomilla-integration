import type { CamomillaOptions } from '../types/camomillaOptions.ts'

export function getIntegrationOptions(): CamomillaOptions {
  const integrationOptions = import.meta.env.CAMOMILLA_INTEGRATION_OPTIONS || {}
  return integrationOptions as CamomillaOptions
}
