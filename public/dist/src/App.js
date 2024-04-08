import TopMenu from './components/TopMenu.js'
import { style } from './utils/style.js'

style(`
.top-menu{
/*margin-bottom: 10px;*/
}
`)

export default {
  components: { TopMenu },
  setup() {
    return {}
  },
  template: `
<div>
  <TopMenu class="top-menu"/>
  <RouterView />
</div>
`
}