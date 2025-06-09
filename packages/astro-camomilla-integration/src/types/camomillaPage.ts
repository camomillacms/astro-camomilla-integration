export interface CamomillaPage {
  id: number
  is_public: boolean
  status: number
  indexable: boolean
  alternates: Record<string, string | null>
  permalink: string
  related_name: string
  translations: Record<string, CamomillaPage>
  breadcrumbs: {
    permalink: string
    title: string
  }[]
  routerlink: string
  template_file: string
  title: string | null
  description: string | null
  og_description: string | null
  og_title: string | null
  og_type: string | null
  og_url: string | null
  canonical: string | null
  meta: Record<string, unknown>
  identifier: string
  date_created: string
  date_updated_at: string
  breadcrumbs_title: string | null
  template: string
  template_data: Record<string, unknown>
  ordering: number
  publication_date: string | null
  autopermalink: boolean
  og_image: string | null
  parent_page: string | null
  url_node: {
    id: number
    permalink: string
    related_name: string
  }
  redirect: string | null
}
