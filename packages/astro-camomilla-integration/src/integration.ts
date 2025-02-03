import { defineIntegration } from "astro-integration-kit";
import defaultOptions from "./defaults.ts";
import { optionsSchema } from "./types/camomillaOptions.ts";

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
            },
          });
          addMiddleware({
            entrypoint: "astro-camomilla-integration/middleware",
            order: "pre",
          });
          if (options.autoRuting) {
            injectRoute({
              pattern: "/[...path]",
              entrypoint: "astro-camomilla-integration/router-index.astro",
              prerender: false,
            });
          }
        },
      },
    };
  },
});
