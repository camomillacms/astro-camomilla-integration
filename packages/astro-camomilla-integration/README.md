# astro-camomilla-integration [![npm](https://img.shields.io/npm/v/astro-camomilla-integration?style=flat-square)](https://www.npmjs.com/package/astro-camomilla-integration) [![GitHub](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/lotrekagency/astro-camomilla-integration/blob/master/LICENSE.md)

## Setup
Add `astro-camomilla-integration` dependency to your project
```sh
yarn add --dev astro-camomilla-integration # or npm install --save-dev astro-camomilla-integration
```
Add astro-camomilla-integration to the modules section of nuxt.config.js
```js
{
  modules: [
    // Simple usage
    'astro-camomilla-integration',

    // With options
    ['astro-camomilla-integration', { /* module options */ }]
  ]
}
```
 
 You can add options also from top level nuxt.config.js

```js
{
  modules: [
    'astro-camomilla-integration'
  ],
  mapo: {
    /* module options */
  }
}
```
## Features

- Exposes [`$mapo`](https://lotrekagency.github.io/mapo/core/) core sevices to provide set of utilities.
- Injects mapo [`components`](https://lotrekagency.github.io/mapo/components/) in the default nuxt component discovery.
- Adds meta information to router module from nuxt pages.

📑 &nbsp;Read more from the [documentation](https://lotrekagency.github.io/mapo/).

## How to contribute

1. Clone this repository
2. Install dependencies using `yarn bootstrap`
3. Start development server using `yarn dev`

### Documenting components
Always write some documentation regarding the components you're developing.
Our documentation is generated directly from code thanks to [@Vuepress](https://vuepress.vuejs.org/), [@Vuese](https://vuese.org/) and [@jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown#readme).

1. Generate doc `yarn doc:gen`
2. Preview vuepress doc `yarn doc:dev`

