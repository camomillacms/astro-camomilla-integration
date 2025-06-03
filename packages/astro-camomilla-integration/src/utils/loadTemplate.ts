import type { AstroInstance } from "astro";
import DefaultTemplate from "../templates/default.astro";

export async function loadTemplate(
  templateName: string | string[] | undefined,
  template_map: Record<string, any>
) {
  if (templateName && !Array.isArray(templateName)) {
    templateName = [templateName];
  }
  for (const name of templateName || []) {
    if (name in template_map) {
      return template_map[name] as AstroInstance["default"];
    }
  }
  console.warn(
    `Could not load template ${templateName}` +
      `,\nFalling back to default template @camomillacms/astro-integration/templates/default.astro`
  );
  return DefaultTemplate as AstroInstance["default"];
}
