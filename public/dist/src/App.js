import TopMenu from './components/TopMenu.js'
import { style } from './utils/style.js'
import { ref, provide } from './import/vue.js'
import SearchDialog from './components/SearchDialog.js'

style(`
.top-menu{
/*margin-bottom: 10px;*/
}
`)

export default {
  components: { TopMenu, SearchDialog },
  setup() {

    const showSearchDialog = ref(false)

    function openSearchDialog() {
      showSearchDialog.value = true
    }

    provide('openSearchDialog', {
      openSearchDialog
    })

    return {
      showSearchDialog
    }
  },
  template: `
<div>
  <TopMenu class="top-menu"/>
  <RouterView />
  <SearchDialog v-model="showSearchDialog" />
</div>
`
}