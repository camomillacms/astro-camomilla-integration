import type { AstroInstance } from 'astro'
import type { CamomillaPage } from './camomillaPage.ts'
import type { CamomillaUser } from './camomillaUser.ts'
import type { Cacheable } from 'cacheable'

export interface CamomillaHandler {
  response: Response | null
  page: CamomillaPage | null
  Template: AstroInstance['default'] | null
  user: CamomillaUser | null
  error: object | null
  template_file?: string | null
  cache: (seconds: number | 'NEVER_CACHE') => void
  cacheStore: Cacheable | null
}
