import ChangeList from './admin/change_list.astro'
import DefaultTemplate from './default.astro'

const templates = {
  'defaults/pages/default': DefaultTemplate,
  'admin/change_list': ChangeList
}

export default templates
