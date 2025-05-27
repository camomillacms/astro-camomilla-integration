import { defineMiddleware } from "astro/middleware";
import { loadTemplate } from "./loadTemplate.ts";
import type { CamomillaHandler } from "../types/camomillaHandler.ts";
import type { CamomillaPage } from "../types/camomillaPage.ts";

export const onRequest = defineMiddleware(async (context: any, next) => {
  if (
    context.url.pathname.match(
      /^\/(favicon\.ico|robots\.txt|manifest\.json|assets\/|.*\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|otf|mp4|webm|txt|xml|json))$/
    )
  ) {
    return next();
  }
  const camomilla: CamomillaHandler = {
    response: null,
    page: null,
    Template: null,
    error: null,
  };
  const { CAMOMILLA_INTEGRATION_OPTIONS } = import.meta.env;

  const serverUrl = CAMOMILLA_INTEGRATION_OPTIONS?.server;

  const resp = await fetch(
    `${serverUrl}/api/camomilla/pages-router${context.url.pathname}`
  );
  camomilla.response = resp;
  if (resp.ok) {
    camomilla.page = await resp.json();
    if (camomilla.page?.redirect && camomilla.page?.status == "301") {
      const baseUrl = context.url.href.replace(context.url.pathname, "");
      const redirectTo = `${baseUrl}${camomilla.page.redirect}`;
      return Response.redirect(redirectTo, 301);
    }
    const { template_file } = page as CamomillaPage;
    context.locals.camomilla.template_file = template_file;
  } else {
    camomilla.error = await resp.json();
  }
  context.locals.camomilla = camomilla;
  return next();
});
