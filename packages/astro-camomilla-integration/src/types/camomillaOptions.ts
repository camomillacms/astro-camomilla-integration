import { z } from 'astro/zod'

export const cacheSchema = z.object({
  backend: z.enum(['memory', 'redis', 'valkey', 'memcache']).default('memory'),
  location: z.string().optional(),
  ttl: z.union([z.string().regex(/^\d+(s|m|h)$/), z.number()]).default(60),
  keyPrefix: z.string().default('astro-camomilla-cache'),
  varyOnHeaders: z.array(z.string()).default([])
})

export type CacheConfig = z.infer<typeof cacheSchema>

export const optionsSchema = z.object({
  server: z.string(),
  // 'server' (default): every page resolves on-demand via SSR middleware —
  // today's behavior. 'static': the autoRouting catch-all is prerendered at
  // build time (getStaticPaths + the incremental-build CLI) for a JAMStack /
  // CDN deploy. Editor preview stays on a separate mode:'server' instance.
  mode: z.enum(['server', 'static']).default('server'),
  autoRouting: z.boolean().default(true),
  templatesIndex: z.string().default('./src/templates/index.js'),
  stylesIndex: z.string().optional(),
  forwardedHeaders: z.array(z.string()).default([]),
  cache: cacheSchema.partial().optional(),
  debug: z.boolean().default(false),
  enableTransitions: z.boolean().default(false),
  staticProxy: z
    .union([
      z.boolean(),
      z.object({ allow: z.array(z.string()).optional(), deny: z.array(z.string()).optional() })
    ])
    .default(true)
})

export type CamomillaOptions = z.infer<typeof optionsSchema>
