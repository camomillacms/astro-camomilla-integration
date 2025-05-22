import { z } from "astro/zod";

export const optionsSchema = z.object({
  server: z.string(),
  autoRuting: z.boolean().default(true),
  templatesIndex: z.string().default("./src/templates/index.js"),
  stylesIndex: z.string().optional(),
});

export type CamomillaOptions = z.infer<typeof optionsSchema>;
