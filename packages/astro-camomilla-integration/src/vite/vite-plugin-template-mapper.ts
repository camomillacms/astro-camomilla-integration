import type { Plugin } from 'vite'

export function vitePluginTemplateMapper(templatesIndex: string): Plugin {
  const virtualModuleId = 'virtual:camomilla-templates-map'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vite-plugin-template-mapper',
    async resolveId(id: string): Promise<string | undefined> {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
      return undefined
    },
    async load(id: string): Promise<string | undefined> {
      if (id === resolvedVirtualModuleId) {
        const resolvedTemplatesId = await this.resolve(templatesIndex)
        if (!resolvedTemplatesId) {
          throw new Error(
            `Templates mapping is missing. Please add index.js to your templates folder.`
          )
        } else {
          return `import { default as templates } from "${resolvedTemplatesId.id}";
            export { templates }`
        }
      }
      return undefined
    }
  }
}
