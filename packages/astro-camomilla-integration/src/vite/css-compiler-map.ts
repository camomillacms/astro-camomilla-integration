export enum CssCompilerEnum {
	EMPTY = "empty",
	CSS = "css",
	SCSS = "scss",
}

const EMPTY_MODULE = () =>
	`const styles = undefined;
		export { styles }`;

const CSS_MODULE = (path: string) => 
	`import cssText from '${path}?raw';
		const styles = cssText
		export { styles }`;

const SCSS_MODULE = (path: string) =>
	`import * as sass from "sass";         
		const styles = sass.compile('${path}').css
		export { styles }`;
					

const cssCompilerMap = {
	[CssCompilerEnum.EMPTY]: EMPTY_MODULE,
	[CssCompilerEnum.CSS]: CSS_MODULE,
	[CssCompilerEnum.SCSS]: SCSS_MODULE,
};

export default cssCompilerMap;