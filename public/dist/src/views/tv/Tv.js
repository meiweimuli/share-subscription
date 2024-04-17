import { tmdbClient } from '../../utils/client.js'
import { ref, computed, watch } from '../../import/vue.js'


import { ElMessage } from '../../import/element.js'
import SeasonDialog from './SeasonDialog.js'
import SearchDialog from '../../components/SearchDialog.js'

export default {
  components: { SeasonDialog, SearchDialog },
  setup() {

    const tvList = ref([])

    const query = ref('')
    const quering = ref(false)
    const doQuery = async () => {
      quering.value = true
      const result = await tmdbClient.get('https://api.themoviedb.org/3/search/tv', { params: { query: query.value } })
      tvList.value = result.results
      quering.value = false

      for (const tv of tvList.value) {
        (async () => {
          const id = tv.id
          const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${id}/external_ids`)
          const translations = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${id}/translations`)
          tv.external_ids = externalIds
          tv.translations = translations?.translations ?? []
          tv.chinese_name = tv.translations.find(item => item.iso_3166_1 === 'CN')?.data?.name
            || tv.translations.find(item => item.iso_3166_1 === 'SG')?.data?.name
            || (tv.original_language === 'zh' && tv.original_name) || ''
        })()
      }
    }

    const doCopy = (data) => {
      const tempInput = document.createElement('textarea')
      tempInput.value = data
      document.body.append(tempInput)
      tempInput.select()
      document.execCommand('copy')
      ElMessage.success('复制成功')
      tempInput.remove()
    }

    const imdbIdQuery = ref('')
    const tvDetail = ref({})
    const tvFolderName = computed(() => {
      const detail = tvDetail.value
      const imdbFragment = detail.external_ids?.imdb_id ? ` {imdb-${detail.external_ids?.imdb_id}}` : ''
      return detail.id ? `${detail.chinese_name} (${detail.first_air_date?.substring(0, 4) ?? ''}) {tmdb-${detail.id}}${imdbFragment} [${detail.original_name ?? ''}] [${detail.name ?? ''}]` : ''
    })
    const infuseEpisodeName = computed(() => {
      const detail = tvDetail.value
      return detail.id ? `${detail.chinese_name} - S01E$1$2` : ''
    })
    const seasonFolderNames = computed(() => tvDetail.value.seasons ? tvDetail.value.seasons.map(season => `Season ${`${season.season_number}`.padStart(2, '0')} [${season.name}]`) : [])
    const seasonFolderNamesString = computed(() => seasonFolderNames.value.join('\n'))
    const seasonList = ref([])
    const searchingTv = ref(false)
    const doImdbIdQuery = async () => {
      const findResult = await tmdbClient.get(`https://api.themoviedb.org/3/find/${imdbIdQuery.value}?external_source=imdb_id`)
      const tvId = findResult?.tv_results?.[0]?.id
      if (!tvId) {
        ElMessage.error('没有找到')
        return
      }
      selectTv(tvId)
    }
    const selectTv = async (id) => {
      searchingTv.value = true
      const tv = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${id}`)
      const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${id}/external_ids`)
      const translations = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${id}/translations`)
      tv.external_ids = externalIds
      tv.translations = translations?.translations ?? []
      tv.chinese_name = tv.translations.find(item => item.iso_3166_1 === 'CN')?.data?.name
        || tv.translations.find(item => item.iso_3166_1 === 'SG')?.data?.name
        || (tv.original_language === 'zh' && tv.original_name) || ''
      tvDetail.value = tv
      searchingTv.value = false
    }

    const currentSeasonNumber = ref(0)
    const showSeasonDialog = ref(false)
    const openSeasonDialog = async (seasonNumber) => {
      console.log(seasonNumber)
      currentSeasonNumber.value = seasonNumber
      showSeasonDialog.value = true
    }

    const showSearchDialog = ref(false)

    return {
      tvList,
      query,
      quering,
      doQuery,
      doCopy,

      imdbIdQuery,
      searchingTv,
      selectTv,
      tvDetail,
      seasonList,
      doImdbIdQuery,
      tvFolderName,
      infuseEpisodeName,
      seasonFolderNames,
      seasonFolderNamesString,

      currentSeasonNumber,
      showSeasonDialog,
      openSeasonDialog,

      showSearchDialog
    }
  },
  template: `
<SearchDialog v-model="showSearchDialog" />
<ElButton @click="showSearchDialog = true">搜索</ElButton>
<SeasonDialog v-model="showSeasonDialog" :seriesId="tvDetail.id" :seasonNumber="currentSeasonNumber" />
  <ElCard>
    <div>
      <ElFormItem label="imdbId查询">
        <ElInput v-model="imdbIdQuery"
                  @keyup.enter.native="doImdbIdQuery"></ElInput>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" :disabled="!imdbIdQuery" @click="doImdbIdQuery">查询</ElButton>
      </ElFormItem>

      <ElDescriptions class="margin-top" title="节目" :column="1" border :loading="searchingTv">
        <ElDescriptionsItem>
          <template #label>
            节目文件夹
          </template>
          <div @click="doCopy(tvFolderName)">{{ tvFolderName }}</div>
        </ElDescriptionsItem>
        <ElDescriptionsItem>
          <template #label>
            infuse文件名
          </template>
          <div @click="doCopy(infuseEpisodeName)">{{ infuseEpisodeName }}</div>
        </ElDescriptionsItem>
          <ElDescriptionsItem>
            <template #label>
            <span @click="doCopy(seasonFolderNamesString)">季文件夹</span>
            </template>
              <template v-for="(item) in tvDetail.seasons">
                     <div @click="openSeasonDialog(item.season_number)">
                {{ item.name }}
              </div>       
</template>

          </ElDescriptionsItem>
      </ElDescriptions>

    </div>
  </ElCard>
  <ElCard>
    <div>
      <ElFormItem label="文本查询">
        <ElInput v-model="query" @keyup.enter.native="doQuery"></ElInput>
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" :disabled="!query" @click="doQuery">查询</ElButton>
      </ElFormItem>

      <ElTable :data="tvList" v-loading="quering">
        <ElTableColumn prop="name" label="英文标题">
          <template v-slot="{row}">
            <div @click="doCopy(row.name)">{{ row.name }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="original_name" label="原始标题"></ElTableColumn>
        <ElTableColumn prop="chinese_name" label="中文标题">
          <template v-slot="{row}">
            <div @click="doCopy(row.chinese_name)">{{ row.chinese_name }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="first_air_date" label="年份"></ElTableColumn>
        <ElTableColumn prop="external_ids.imdb_id" label="imdbId">
          <template v-slot="{row}">
            <div @click="doCopy(row.external_ids?.imdb_id)">{{ row.external_ids?.imdb_id }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn fixed="right" label="操作" width="120">
          <template v-slot="{row}">
            <ElButton link type="primary" size="small" @click.prevent="selectTv(row.id)">
              查看
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

    </div>
  </ElCard>
`
}