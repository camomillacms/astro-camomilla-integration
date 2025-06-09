/// <reference types="vite/client" />
/// <reference types="vite/types/importMeta.d.ts" />

import type { CamomillaOptions } from './src/types/camomillaOptions.ts'

interface ImportMetaEnv {
  readonly CAMOMILLA_INTEGRATION_OPTIONS: CamomillaOptions
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
