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
  autoRouting: z.boolean().default(true),
  templatesIndex: z.string().default('./src/templates/index.js'),
  stylesIndex: z.string().optional(),
  forwardedHeaders: z.array(z.string()).default([]),
  cache: cacheSchema.partial().optional(),
  debug: z.boolean().default(false),
  enableTransitions: z.boolean().default(false)
})

export type CamomillaOptions = z.infer<typeof optionsSchema>
