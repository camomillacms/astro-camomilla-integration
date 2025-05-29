import { createResolver, defineIntegration } from "astro-integration-kit";
import { readFileSync } from "node:fs";
import defaultOptions from "./defaults.ts";
import { optionsSchema } from "./types/camomillaOptions.ts";
import { vitePluginTemplateMapper } from "./vite/vite-plugin-template-mapper.ts";
import { vitePluginCssCompiler } from "./vite/vite-pugin-css-compiler.ts";

export const integration = defineIntegration({
  name: "astro-camomilla-integration",
  optionsSchema,
  setup({ options }): { hooks: any } {
    const { resolve } = createResolver(import.meta.url)
    return {
      hooks: {
        "astro:config:setup": ({
          addMiddleware,
          injectRoute,
          updateConfig,
        }: any) => {
          updateConfig({
            vite: {
              define: {
                "import.meta.env.CAMOMILLA_INTEGRATION_OPTIONS": {
                  ...options,
                  ...defaultOptions,
                },
              },
              plugins: [
                vitePluginTemplateMapper(options.templatesIndex),
                vitePluginCssCompiler(options.stylesIndex),
              ],
              build: {
                cssCodeSplit: false,
              },
            },
          });
          addMiddleware({
            entrypoint: "@camomillacms/astro-integration/middleware",
            order: "pre",
          });
          injectRoute({
            pattern: "/api/templates",
            entrypoint: resolve("./api/templates.ts")
          });
          if (options.autoRouting) {
            injectRoute({
              pattern: "/[...path]",
              entrypoint: "@camomillacms/astro-integration/router-index.astro",
              prerender: false,
            });
          }
        },
        "astro:config:done": (params: any) => {
          params.injectTypes({
            filename: "camomilla-integration.d.ts",
            content: readFileSync(resolve("./env.d.ts"), 'utf8')
          })
        }
      },
    };
  },
});
