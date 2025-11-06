import node from '@astrojs/node'
import vue from '@astrojs/vue'
import { createResolver } from 'astro-integration-kit'
import { hmrIntegration } from 'astro-integration-kit/dev'
import { defineConfig } from 'astro/config'
import { mockServer } from '../tests/e2e/mocks/node.ts'

import react from '@astrojs/react'

if (process.env.APP_ENV === 'e2e') mockServer.listen()

const { default: camomilla } = await import('@camomillacms/astro-integration')

// https://astro.build/config
export default defineConfig({
  integrations: [
    camomilla({
      server: 'http://localhost:8000',
      autoRouting: true,
      templatesIndex: './src/templates/index.js',
      stylesIndex: 'src/styles/main.scss',
      forwardedHeaders: ['x-forwarded-host', 'referer', 'x-forwarded-for'],
      cache:
        process.env.APP_ENV === 'e2e'
          ? {
              backend: 'memory', // Can be 'memory', 'redis', 'valkey', 'memcache'
              ttl: 60 * 60 * 1000, // Time to live in milliseconds or s, m, h (e.g. "1h" for 1 hour)
              keyPrefix: 'astro-camomilla-integration', // Prefix for the cache keys
              varyOnHeaders: [] // Headers to vary the cache on
            }
          : undefined
    }),
    vue({ appEntrypoint: './src/_app.js' }),
    hmrIntegration({
      directory: createResolver(import.meta.url).resolve('../packages/astro-camomilla-integration')
    }),
    react()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    build: {
      cssCodeSplit: false
    }
  }
})
