export enum CssCompilerEnum {
  CSS = 'css',
  SCSS = 'scss',
  UNDEFINED = 'undefined'
}

const CSS_MODULE = (path: string) =>
  `import cssText from '${path}?raw';
		const styles = cssText
		export { styles }`

const SCSS_MODULE = (path: string) =>
  `import * as sass from "sass";         
		const styles = sass.compile('${path}').css
		export { styles }`

const UNDEFINED_MODULE = () => `export const styles = undefined;`

const cssCompilerMap = {
  [CssCompilerEnum.CSS]: CSS_MODULE,
  [CssCompilerEnum.SCSS]: SCSS_MODULE,
  [CssCompilerEnum.UNDEFINED]: UNDEFINED_MODULE
}

export default cssCompilerMap
