import { z } from "astro/zod";

export const optionsSchema = z.object({
  server: z.string(),
  autoRuting: z.boolean().default(true),
});

export type CamomillaOptions = z.infer<typeof optionsSchema>;
