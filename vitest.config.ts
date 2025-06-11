import { getViteConfig } from 'astro/config';
import { resolve } from 'node:path';

export default getViteConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ["packages/astro-camomilla-integration/src/**/*.{ts,tsx}"],
      exclude: [
        'packages/astro-camomilla-integration/src/vite/**/*'
      ],
      thresholds: {
        100: true
      },
      reporter: ['text', 'json-summary', 'json'],
    },
    alias: {
      'virtual:camomilla-css-compiler': resolve('./packages/astro-camomilla-integration/src/types/virtual-camomilla-css-compiler.d.ts'),
      'virtual:camomilla-templates-map': resolve('./packages/astro-camomilla-integration/src/types/virtual-camomilla-templates-map.d.ts'),
    },
  },
})