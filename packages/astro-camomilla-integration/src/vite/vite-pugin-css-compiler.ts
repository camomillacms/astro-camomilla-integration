import type { Plugin } from "vite";
import cssCompilerMap, { CssCompilerEnum } from "./css-compiler-map.ts";

export function vitePluginCssCompiler(stylesIndex?: string): Plugin {
	const virtualModuleId = "virtual:camomilla-css-compiler";
	const resolvedVirtualModuleId = "\0" + virtualModuleId;

	return {
		name: "vite-plugin-css-compiler",
		async resolveId(id: string): Promise<string | undefined> {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
			return undefined;
		},
		async load(id: string): Promise<string | undefined> {
			if (id === resolvedVirtualModuleId) {
				if (!stylesIndex) return cssCompilerMap[CssCompilerEnum.UNDEFINED]();

				const isScss = stylesIndex.includes(".scss");
				const isCss = stylesIndex.includes(".css");

				if (!isScss && !isCss) {
					throw new Error(
						`Astro integration styles index must be a .scss or .css file.`
					);
				}

				const resolvedCssCompilerId = await this.resolve(stylesIndex);

				if (!resolvedCssCompilerId) {
					throw new Error(
						`Styles mapping is wrong. Please add your styles to your styles folder.`
					);
				} else {
					if (resolvedCssCompilerId.id.includes(".scss")) {
						return cssCompilerMap[CssCompilerEnum.SCSS](resolvedCssCompilerId.id)
					}

					if (resolvedCssCompilerId.id.includes(".css")) {
						return cssCompilerMap[CssCompilerEnum.CSS](resolvedCssCompilerId.id)
					}
					return undefined
				}
			}
			return undefined;
		},
	};
}
