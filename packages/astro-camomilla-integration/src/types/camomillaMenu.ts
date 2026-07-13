/**
 * Shape of a single navigable item inside a ``Menu``.
 *
 * Camomilla's ``MenuNodeLink`` distinguishes between relational links
 * (``link_type: "RE"`` pointing at a ``UrlNode``) and static links
 * (``link_type: "ST"`` with a hardcoded URL string). Either way, the
 * serializer resolves a final ``url`` field so consumers don't have to
 * branch on the type to render the anchor.
 */
export interface CamomillaMenuLink {
  link_type: 'RE' | 'ST'
  static?: string | null
  url?: string | null
  url_node?: {
    id: number
    permalink: string
    related_name?: string
  } | null
  page?: { id: number; name: string; model: string } | null
}

export interface CamomillaMenuNode {
  id?: string
  title: string
  link: CamomillaMenuLink
  nodes: CamomillaMenuNode[]
  meta?: Record<string, unknown>
}

export interface CamomillaMenu {
  id: number
  key: string
  enabled: boolean
  nodes: CamomillaMenuNode[]
}
