import type { AstroInstance } from 'astro';
import { templates } from 'virtual:camomilla-templates-map';
import DefaultTemplate from '../templates/default.astro';


export async function loadTemplate(templateName: string | undefined) {
  templateName = templateName || '';
  templateName = templateName.replace('.html', '');
  const Template = templates[templateName];
  if (Template) {
    return Template as AstroInstance["default"];
  } else {
    console.warn(`Could not load template ${templateName}`+
      `,\nFalling back to default template @camomillacms/astro-integration/templates/default.astro`
      );
    return DefaultTemplate as AstroInstance["default"];
  }
}
