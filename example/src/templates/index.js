import ChangeList from './admin/change_list.astro'
import DefaultTemplate from './default.astro'

import SiteHome from './site/home.astro'
import SiteDefault from './site/default.astro'
import SiteServices from './site/services.astro'
import SiteBlogList from './site/blog_list.astro'
import SiteArticleDetail from './site/article_detail.astro'

/**
 * Maps the ``template_file`` value returned by the camomilla
 * ``pages-router`` (or ``pages-router-preview``) response to an Astro
 * component. The lookup is exact, so the keys must match the full path
 * including the ``.html`` extension exactly as set on ``Page.template``
 * in the camomilla seed.
 */
const templates = {
  // Demo site templates — matched 1:1 to example/website/templates/website/*
  // on the camomilla side. Same content, same shape, rendered through astro.
  'website/pages/home.html': SiteHome,
  'website/pages/default.html': SiteDefault,
  'website/pages/services.html': SiteServices,
  'website/pages/blog_list.html': SiteBlogList,
  'website/articles/detail.html': SiteArticleDetail,

  // Legacy / debug
  'defaults/pages/default': DefaultTemplate,
  'admin/change_list': ChangeList
}

export default templates
