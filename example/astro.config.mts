import { createResolver } from "astro-integration-kit";
import { hmrIntegration } from "astro-integration-kit/dev";
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import node from "@astrojs/node";

import react from "@astrojs/react";

const { default: camomilla } = await import("@camomillacms/astro-integration");

// https://astro.build/config
export default defineConfig({
  integrations: [
    camomilla({
      server: "http://localhost:8000",
      autoRuting: true,
      templatesIndex: "./src/templates/index.js",
      stylesIndex: "src/styles/main.scss",
    }),
    vue({ appEntrypoint: "./src/_app.js" }),
    hmrIntegration({
      directory: createResolver(import.meta.url).resolve(
        "../packages/astro-camomilla-integration"
      ),
    }),
    react(),
  ],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
});
