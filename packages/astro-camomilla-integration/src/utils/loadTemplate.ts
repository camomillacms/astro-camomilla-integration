import DefaultTemplate from '../templates/default.astro';
export async function loadTemplate(templateName: string | undefined) {
  templateName = templateName || '';
  templateName = templateName.replace('.html', '');
  const projectDir = process.cwd();
  try {
    const { default: Template } = await import(/* @vite-ignore */`${projectDir}/src/templates/${templateName}.astro`);
    return Template;
  } catch (e) {
    console.warn(`Could not load template ${projectDir}/src/templates/${templateName}.astro`+
    `,\nFalling back to default template astro-camomilla-integration/templates/default.astro`
    );
    return DefaultTemplate;
  }
}
