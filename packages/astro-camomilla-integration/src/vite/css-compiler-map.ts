export enum CssCompilerEnum {
	CSS = "css",
	SCSS = "scss",
}

const CSS_MODULE = (path: string) => 
	`import cssText from '${path}?raw';
		const styles = cssText
		export { styles }`;

const SCSS_MODULE = (path: string) =>
	`import * as sass from "sass";         
		const styles = sass.compile('${path}').css
		export { styles }`;
					

const cssCompilerMap = {
	[CssCompilerEnum.CSS]: CSS_MODULE,
	[CssCompilerEnum.SCSS]: SCSS_MODULE,
};

export default cssCompilerMap;