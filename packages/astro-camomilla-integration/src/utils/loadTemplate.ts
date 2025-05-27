import type { AstroInstance } from "astro";
import DefaultTemplate from "../templates/default.astro";

export async function loadTemplate(
  templateName: string | undefined,
  template_map: Record<string, any>
) {
  templateName = templateName || "";
  templateName = templateName.replace(".html", "");
  const Template = template_map[templateName];
  if (Template) {
    return Template as AstroInstance["default"];
  } else {
    console.warn(
      `Could not load template ${templateName}` +
        `,\nFalling back to default template @camomillacms/astro-integration/templates/default.astro`
    );
    return DefaultTemplate as AstroInstance["default"];
  }
}
