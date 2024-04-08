import { ref } from '../import/vue.js'
import { style } from '../utils/style.js'
import { SettingDialog } from './SettingDialog.js'
import { useRoute } from '../import/vue-router.js'

style(`
.setting-button{
align-self: center;
margin-left: 10px;
}
`)

export default {
  components: { SettingDialog },
  setup() {

    const route = useRoute()
    console.log(route.path)
    const activeIndex = ref(route.path)
    const handleSelect = (key, keyPath) => {
      console.log(key, keyPath)
    }

    const showSettingDialog = ref(false)

    return {
      activeIndex,
      handleSelect,

      showSettingDialog
    }
  },
  template: `
<div>
<ElMenu
    :default-active="activeIndex"
    mode="horizontal"
    router
    @select="handleSelect"
  >
    <ElMenuItem index="/yp">阿里云盘</ElMenuItem>
    <ElMenuItem index="/sub">分享订阅</ElMenuItem>
    <ElMenuItem index="/movie">电影搜索</ElMenuItem>
    <ElMenuItem index="/tv">节目搜索</ElMenuItem>
    <ElButton class="setting-button" @click="showSettingDialog = true">配置</ElButton>
  </ElMenu>
<SettingDialog v-model="showSettingDialog" />
</div>
`
}