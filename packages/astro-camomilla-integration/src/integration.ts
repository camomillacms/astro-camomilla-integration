import { defineIntegration } from "astro-integration-kit";
import defaultOptions from "./defaults.ts";
import { optionsSchema } from "./types/camomillaOptions.ts";
import { vitePluginTemplateMapper } from "./vite/vite-plugin-template-mapper.ts";

export const integration = defineIntegration({
  name: "astro-camomilla-integration",
  optionsSchema,
  setup({ options }): { hooks: any } {
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
              ],
            },
          });
          addMiddleware({
            entrypoint: "@camomillacms/astro-integration/middleware",
            order: "pre",
          });
          if (options.autoRuting) {
            injectRoute({
              pattern: "/[...path]",
              entrypoint: "@camomillacms/astro-integration/router-index.astro",
              prerender: false,
            });
          }
        },
      },
    };
  },
});
