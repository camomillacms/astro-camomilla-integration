import DefaultTemplate from '../templates/default.astro';
import { templates } from 'virtual:camomilla-templates-map';


export async function loadTemplate(templateName: string | undefined) {
  templateName = templateName || '';
  templateName = templateName.replace('.html', '');
  const Template = templates[templateName];
  if (Template) {
    return Template;
  } else {
    console.warn(`Could not load template ${templateName}`+
      `,\nFalling back to default template astro-camomilla-integration/templates/default.astro`
      );
    return DefaultTemplate;
  }
}
