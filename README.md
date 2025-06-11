
[![NPM Version](https://img.shields.io/npm/v/%40camomillacms%2Fastro-integration?style=flat-square)](https://www.npmjs.com/package/@camomillacms/astro-integration)
[![Build](https://img.shields.io/github/actions/workflow/status/camomillacms/astro-camomilla-integration/ci.yml?branch=master&style=flat-square)](https://github.com/camomillacms/astro-camomilla-integration/actions)
[![Last Commit](https://img.shields.io/github/last-commit/camomillacms/astro-camomilla-integration?style=flat-square)](https://github.com/camomillacms/astro-camomilla-integration/commits/master)
[![Contributors](https://img.shields.io/github/contributors/camomillacms/astro-camomilla-integration?style=flat-square)](https://github.com/camomillacms/astro-camomilla-integration/graphs/contributors)
[![Open Issues](https://img.shields.io/github/issues/camomillacms/astro-camomilla-integration?style=flat-square)](https://github.com/camomillacms/astro-camomilla-integration/issues)
[![Codecov](https://img.shields.io/codecov/c/github/camomillacms/astro-camomilla-integration?style=flat-square)](https://app.codecov.io/gh/camomillacms/astro-camomilla-integration/tree/master/camomilla)

<br>

# 🌟 Astro-Camomilla Integration 🌟

This project is an Astro integration built to be used with Camomilla CMS.
The aim of this project is to provide a simple and easy Frontend integration to easily use Camomilla CMS as a Headless CMS. 🚀

## Key Features

- **Auto Routing**: Automatically create routes for your pages based on the Camomilla CMS api response.
- **SEO Friendly**: Automatically set the title and meta tags of your pages based on the Camomilla CMS api response.
- **SSR**: Server Side Rendering is supported out of the box.
- **Transitions**: Compatible with Astro Transition Engine.
- **Easy to use**: Just install the package and add the integration to your `astro.config.mjs` file.

## Usage

Given an Astro project you need to install this project as a dependency.

```bash
npm add @camomillacms/astro-integration
```

Then you need to add the integration to your `astro.config.mjs` file.

```javascript
import camomilla from "@camomillacms/astro-integration";
import node from "@astrojs/node";

export default {
  integrations: [
    camomilla({
      server: "http://localhost:8000", // Your Camomilla CMS server URL
      autoRouting: true, // If enabled, the integration will automatically create routes for your pages based on the Camomilla CMS api response.
      templatesIndex: "./src/templates/index.js", // Default is ./src/templates/index.js
      stylesIndex: "/src/styles/main.scss", // Can be undefined. Can manage only css or scss
    }),
  ],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
};
```

Remember to replace the `server` option with the URL of your Camomilla CMS server.

> [!NOTE]  
> Remember to replace the `server` option with the URL of your Camomilla CMS server.

> [!WARNING]  
> Camomilla Integration for now it's built only for SSR mode. Remember to set the `output` option to `server` and the `adapter` option to `node`.

## Templates

The integration can automatically route templates based on the Camomilla CMS api response.
To register a template you need to create an `index.js` file in the `src/templates` folder.

```
import MyTemplate from './mytemplate.astro'

const templates = {
  'my-template': MyTemplate
};

export default templates;
```

The template register maps the template name to the template component.
The template name is the name of the template exposed by Camomilla CMS.

## Error Templates

By default the integration will search for `'error'` template in the `src/templates/index.js` file in case of an error coming from the Camomilla CMS API.
Create your custom error template by adding your template in the `src/templates/index.js` file like this:

```javascript
import ErrorTemplate from './error.astro'
const templates = {
  ... // other templates
  'error': ErrorTemplate
};
export default templates;
```

You can handle different types of errors by checking camomilla response status code in your error template like this:

```javascript
---
const status = Astro.locals.camomilla?.response?.status // The status code of the response
const error = Astro.locals.camomilla?.error // The error object returned by Camomilla CMS
---
```

The integration will also search for error codes like `404`, `500`, etc. in the `src/templates/index.js` file.
So to handle a specific error code you can create specific templates like this:

```javascript
import NotFoundTemplate from './404.astro'
import InternalServerErrorTemplate from './500.astro'
const templates = {
  ... // other templates
  '404': NotFoundTemplate,
  '500': InternalServerErrorTemplate
};
export default templates;
```
> [!NOTE]  
>Even if this approach is more fine-grained, it is recommended to always declare a generic `error` template to handle unexpected errors.


## Styles

To inject global styles, add main (css or scss) in stylesIndex option.

## Development

To start the development server you need to run the following command:

```bash
pnpm install
pnpm run dev
```

An example astro project is provided in the `example` folder.
The dev command will start the `example` project to test the integration while developing.

> [!IMPORTANT]  
> Remember to serve a Camomilla CMS server to test the integration on default port `8000`.

## Test

We use two primary types of tests to ensure the reliability and functionality of our application:

### Integration Tests
Integration tests, located in the /tests/integration directory and configured via vitest.config.ts, are designed to verify that different modules or services work together as expected.

You can run these tests using the following command:
```bash
pnpm run test:integration
```

### End-to-End (E2E) Tests
Our End-to-End tests, found in the /tests/e2e directory and configured with cypress.config.js, simulate real user scenarios to ensure the entire application flow functions correctly from start to finish.

Before running E2E tests, make sure to start development server in e2e mode. You can then execute them with:
```bash
pnpm run dev:e2e
pnpm run test:e2e
```

If this is your first time using Cypress with your current Node.js installation, you'll need to run a quick setup command:

```bash
pnpm cypress install
```
This ensures all necessary Cypress binaries are correctly installed and configured for your environment.

## Lint & Format

Keep your codebase clean and consistent with linting and formatting!

You have a couple of options:

Manually run: To lint and format your code whenever you need, just run:

```bash
pnpm run lint
```

Automate with Husky: For a hassle-free experience, let Husky handle it! It's configured to automatically lint and format your code during the commit process, ensuring everything is tidy before it even hits your repository.mit
