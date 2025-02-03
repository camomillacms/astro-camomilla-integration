import { createResolver } from "astro-integration-kit";
import { hmrIntegration } from "astro-integration-kit/dev";
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import node from "@astrojs/node";

const { default: camomilla } = await import("astro-camomilla-integration");

// https://astro.build/config
export default defineConfig({
  integrations: [
    camomilla({
      server: "http://localhost:8000",
      autoRuting: true,
    }),
    vue({ appEntrypoint: "./src/_app.js" }),
    hmrIntegration({
      directory: createResolver(import.meta.url).resolve(
        "../packages/astro-camomilla-integration"
      ),
    }),
  ],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});
