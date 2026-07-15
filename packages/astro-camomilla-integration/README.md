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
import camomilla from '@camomillacms/astro-integration';
import node from "@astrojs/node";

export default {
    integrations: [
        camomilla({
            server: "http://localhost:8000", // Your Camomilla CMS server URL
            autoRouting: true, // If enabled, the integration will automatically create routes for your pages based on the Camomilla CMS api response.
            templatesIndex: "./src/templates/index.js", // Default is ./src/templates/index.js
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


## Inline editing (djsuperadmin)

Let superusers edit camomilla `Content` in place, right on the rendered page,
powered by [djsuperadmin](https://github.com/lotrekagency/djsuperadmin). Reference
a block by `identifier` and drop `<DjSuperAdminScript />` once in your layout:

```astro
---
// a page template
import CamomillaContent from '@camomillacms/astro-integration/components/CamomillaContent.astro'
---
<CamomillaContent identifier="hero">
  <p>…</p>
  <!-- inner HTML is the fallback, shown until an editor fills the block -->
</CamomillaContent>
```

```astro
---
// your layout, once, near </body>
import DjSuperAdminScript from '@camomillacms/astro-integration/components/DjSuperAdminScript.astro'
---
<slot />
<DjSuperAdminScript />
```

Blocks are keyed by `identifier` and scoped to the **current page** (taken from
`Astro.locals.camomilla.page`, so there's no page id to pass or get wrong):

- `<CamomillaContent identifier="hero" />`

You never pre-seed — a block is get-or-created once, server-side, the first time a
superuser renders it. For non-superusers the plain HTML renders and no editor code
is shipped (gated server-side via `isAccessGranted`). The component's inner HTML is
the fallback content, shown until an editor fills the block. Also accepts
`mode="raw"` (plain-text).

**Performance:** existing blocks are read from the page-router payload
(`page.contents`) with their id, so any number of them on a page cost **zero**
extra fetches; the browser then edits purely by id.

The editor's GET/PATCH go through the integration's own Astro route, which forwards
to camomilla **server-side**. So the browser only ever talks to the Astro origin —
**no CORS, and no `CSRF_TRUSTED_ORIGINS` / reverse-proxy setup**. (A server-to-server
call carries no browser `Origin`, so Django's CSRF origin check is skipped while the
session + CSRF token still authenticate the edit.) Logged-in editors bypass the
page cache (so they see their own edits immediately); anonymous visitors keep the
cached payload.

**Requirements**

- Astro in SSR (`output: "server"`) — the superuser gate and the proxy route are
  per request.
- The djsuperadmin bundle must load in the page. In production Django serves it at
  `/static/djsuperadmin/djsuperadmin.bundle.js` (install `djsuperadmin`, run
  `collectstatic`). The integration proxies camomilla's `/static/` same-origin
  through the astro server, so the component's default `bundleSrc` works with no
  reverse proxy in dev; override with `<DjSuperAdminScript bundleSrc=... />` if it
  lives elsewhere.

**`staticProxy` option** — controls that `/static/` proxy:

- `true` (default) — proxy everything under `/static/`.
- `false` — no proxy route (serve `/static/` via your own reverse proxy).
- `{ allow: ['djsuperadmin/', ...] }` — only these path prefixes.
- `{ deny: ['media/', ...] }` — everything except these prefixes.

A traversal guard keeps it scoped to `/static/`, so it can't be used to reach the
rest of the backend. Behind nginx in production, put `/static` on nginx and this
route never sees the request (or set `staticProxy: false`).

The lower-level, CMS-agnostic `<DjSuperAdmin>` is exported too if you need to wire
custom endpoints.

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
