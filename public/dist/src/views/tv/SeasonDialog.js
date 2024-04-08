import { ref, watch } from '../../import/vue.js'
import { tmdbClient } from '../../utils/client.js'
import { doCopy, padNumber } from './utils.js'

export default {
  props: ['modelValue', 'seriesId', 'seasonNumber'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    const episodeList = ref([])
    const loadEpisodeList = async () => {
      const seriesResp = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${props.seriesId}?language=zh-CN`)
      if (!seriesResp?.name) {
        episodeList.value = []
        return
      }
      const seasonResp = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${props.seriesId}/season/${props.seasonNumber}?language=zh-CN`)
      if (!seasonResp?.episodes) {
        episodeList.value = []
        return
      }
      episodeList.value = seasonResp.episodes
      episodeList.value.forEach(item => item.fileNameWithName = `${seriesResp.name} - S${padNumber(props.seasonNumber)}E${padNumber(item.episode_number)} - ${item.name}`)
      episodeList.value.forEach(item => item.fileName = `${seriesResp.name} - S${padNumber(props.seasonNumber)}E${padNumber(item.episode_number)}`)

    }
    watch(model, v => v && loadEpisodeList())

    const copyNames = () => {
      const data = episodeList.value.map(item => item.fileName + '(?!\\d)\n' + item.fileNameWithName).join('\n\n')
      doCopy(data)
    }

    return {
      model,
      episodeList,
      copyNames
    }
  },
  template: `
<ElDialog v-model="model" title="季详情" width="95%">
<ElButton @click="copyNames">复制</ElButton>
  <ElTable :data="episodeList">
    <ElTableColumn label="名称" sortable :sort-method="(a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')">
      <template #default="{row}">
        {{ row.name }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="文件夹名" prop="fileName" sortable :sort-method="(a, b) => a.fileName.localeCompare(b.fileName, 'zh-Hans-CN')"></ElTableColumn>
  </ElTable>
</ElDialog>
`
}