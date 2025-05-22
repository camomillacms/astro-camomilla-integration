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
      autoRuting: true, // If enabled, the integration will automatically create routes for your pages based on the Camomilla CMS api response.
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
