import { ref, watch } from '../import/vue.js'
import { tmdbClient } from '../utils/client.js'
import { doCopy } from '../utils/copy.js'
import { padNumber } from '../views/tv/utils.js'

export default {
  props: ['modelValue'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    const query = ref({
      text: '',
      imdbId: '',
      tmdbId: '',
      page: 1
    })

    let currentQuery = {}
    const doTextQuery = async () => {
      query.value.page = 1
      currentQuery = { text: query.value.text, page: 1 }
      await doQuery()
    }
    watch(() => query.value.page, async () => {
      currentQuery.page = query.value.page
      await doQuery()
    })

    const totalPage = ref(1)
    const list = ref([])
    const querying = ref(false)
    const doQuery = async () => {
      querying.value = true
      const result = await tmdbClient.get('https://api.themoviedb.org/3/search/multi', {
        params: {
          query: currentQuery.text,
          page: currentQuery.page,
          language: 'en-US'
        }
      })
      totalPage.value = result.total_pages
      list.value = [...result.results.filter(item => item.media_type === 'tv' || item.media_type === 'movie')]
      querying.value = false

      await Promise.all(list.value.map(item => {
        item.media_type === 'movie' ? queryMovie(item) : queryTv(item)
      }))
    }

    const queryMovie = async (movie) => {
      const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${movie.id}/external_ids`)
      const translations = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${movie.id}/translations`)
      movie.external_ids = externalIds
      movie.translations = translations?.translations ?? []
      movie.chinese_title = movie.translations.find(item => item.iso_3166_1 === 'CN')?.data?.title
        || movie.translations.find(item => item.iso_3166_1 === 'SG')?.data?.title
        || (movie.original_language === 'zh' && movie.original_title) || ''
    }

    const queryTv = async (tv) => {
      const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${tv.id}/external_ids`)
      const translations = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${tv.id}/translations`)
      tv.external_ids = externalIds
      tv.translations = translations?.translations ?? []
      tv.chinese_name = tv.translations.find(item => item.iso_3166_1 === 'CN')?.data?.name
        || tv.translations.find(item => item.iso_3166_1 === 'SG')?.data?.name
        || (tv.original_language === 'zh' && tv.original_name) || ''
    }

    const previewing = ref(false)
    const previewingItem = ref({})
    const select = async (item) => {
      if (item.media_type === 'tv') {
        const tv = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${item.id}`)
        if (!tv) {
          return
        }
        const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${item.id}/external_ids`)
        if (!externalIds) {
          return
        }
        tv.external_ids = externalIds
        tv.chinese_name = item.chinese_name
        tv.release_year = tv.first_air_date?.substring(0, 4) ?? ''

        const imdbFragment = tv.external_ids?.imdb_id ? ` {imdb-${tv.external_ids?.imdb_id}}` : ''
        tv.folderName = `${tv.chinese_name} (${tv.release_year}) {tmdb-${tv.id}}${imdbFragment} [${tv.original_name ?? ''}]`
        tv.seasons.forEach(season => {
          season.folderName = `Season ${`${season.season_number}`.padStart(2, '0')} [${season.name}]`
          season.episodeFileName = `${tv.chinese_name} S${`${season.season_number}`.padStart(2, '0')}E$1$2`

          ;(async () => {
            const seasonInfo = await tmdbClient.get(`https://api.themoviedb.org/3/tv/${item.id}/season/${season.season_number}`)
            if (!seasonInfo?.episodes) {
              season.episodeList = []
              return
            }
            seasonInfo.episodes.forEach(item => item.fileNameWithName = `${tv.chinese_name} - S${padNumber(season.season_number)}E${padNumber(item.episode_number)} - ${item.name}`)
            season.episodeList = seasonInfo.episodes
          })()
        })

        previewingItem.value = tv
      } else {
        const movie = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${item.id}`)
        if (!movie) {
          return
        }
        const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${item.id}/external_ids`)
        if (!externalIds) {
          return
        }
        movie.external_ids = externalIds
        movie.chinese_title = item.chinese_title
        movie.release_year = movie.release_date?.substring(0, 4) ?? ''

        const imdbFragment = movie.external_ids?.imdb_id ? ` {imdb-${movie.external_ids?.imdb_id}}` : ''
        movie.folderName = `${movie.chinese_title} (${movie.release_year}) {tmdb-${movie.id}}${imdbFragment} [${movie.original_title ?? ''}]`
        previewingItem.value = movie
      }
      previewing.value = true
      console.log(item)
    }

    const copyAllSeasonFolder = () => {
      doCopy(previewingItem.value.seasons?.map(item => item.folderName).join('\n'))
    }

    const copyEpisodesReplacer = () => {
      const previewingSeason = previewingItem.value.previewingSeason
      doCopy(previewingSeason.episodeList.map(item => {
        const reg = `^.*?((?<![Ss\\d])(?!.*[Ee]\\d+)${padNumber(item.episode_number)}(?!\\d)|(?<=[Ee])${padNumber(item.episode_number)}).*?(?=\\.(?:mp4|mkv|(?:(?:[a-zA-Z]{2,3}\\.)?(?:ass|srt))))`
        return reg + '\n' + item.fileNameWithName
      }).join('\n\n'))
    }

    return {
      model,
      query,
      doTextQuery,
      totalPage,
      list,
      querying,
      select,
      previewing,
      previewingItem,
      copyAllSeasonFolder,
      copyEpisodesReplacer,
      doCopy
    }
  },
  template: `<ElDialog v-model="model" title="搜索" width="95%">
  <ElForm v-show="!previewing" :inline="true">
    <ElFormItem label="文本查询">
      <ElInput v-model="query.text" @keyup.enter.native.prevent="doTextQuery" clearable></ElInput>
    </ElFormItem>
    <ElFormItem>
      <ElButton type="primary" :disabled="!query.text" @click="doTextQuery">查询</ElButton>
    </ElFormItem>
  </ElForm>

  <ElTable v-show="!previewing" :data="list" v-loading="querying">
    <ElTableColumn label="标题">
      <template #default="{row}">
        <span @click="doCopy(row.chinese_name)">{{ row.chinese_title || row.chinese_name }}</span>
      </template>
    </ElTableColumn>
    <ElTableColumn label="原始标题">
      <template #default="{row}">
        <span @click="doCopy(row.chinese_name)">{{ row.original_title || row.original_name }}</span>
      </template>
    </ElTableColumn>
    <ElTableColumn label="英文标题">
      <template #default="{row}">
        <span @click="doCopy(row.chinese_name)">{{ row.title || row.name }}</span>
      </template>
    </ElTableColumn>
    <ElTableColumn label="时间">
      <template #default="{row}">
        {{ row.release_date || row.first_air_date }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="imdbId">
      <template v-slot="{row}">
        <span @click="doCopy(row.external_ids?.imdb_id)">{{ row.external_ids?.imdb_id }}</span>
      </template>
    </ElTableColumn>
    <ElTableColumn label="类型">
      <template v-slot="{row}">
        {{ row.media_type === 'tv' ? '节目' : '电影' }}
      </template>
    </ElTableColumn>
    <ElTableColumn fixed="right" label="操作" width="120">
      <template #default="{row}">
        <ElButton link type="primary" size="small" @click.prevent="select(row)">
          查看
        </ElButton>
      </template>
    </ElTableColumn>
    <template v-if="totalPage>1" #append>
      <ElPagination v-model:current-page="query.page" layout="prev, pager, next" :page-count="totalPage" />
    </template>
  </ElTable>

  <ElDescriptions
    v-show="previewing"
    class="margin-top"
    :title="previewingItem.name || previewingItem.title"
    :column="1"
    border
  >
    <template #extra>
      <ElButton type="primary" @click="previewing = false">返回</ElButton>
    </template>
    <ElDescriptionsItem>
      <template #label>
        <span @click="doCopy(previewingItem.name || previewingItem.title)"  style="cursor: pointer">标题</span>
      </template>
      {{ previewingItem.name || previewingItem.title }}
    </ElDescriptionsItem>
    <ElDescriptionsItem>
      <template #label>
        <span  @click="doCopy(previewingItem.folderName)"  style="cursor: pointer">文件夹名</span>
      </template>
      {{ previewingItem.folderName }}
    </ElDescriptionsItem>
    <ElDescriptionsItem v-if="previewingItem.seasons">
      <template #label>
        <span @click="copyAllSeasonFolder"  style="cursor: pointer">季文件夹名</span>
      </template>
      <div v-for="item in previewingItem.seasons" @click="previewingItem.previewingSeason = item">{{ item.folderName }}</div>
    </ElDescriptionsItem>
    <ElDescriptionsItem v-if="previewingItem.seasons">
      <template #label>
        <span>节目文件名</span>
      </template>
      <div v-for="item in previewingItem.seasons" @click="doCopy(item.episodeFileName)">{{ item.episodeFileName }}</div>
    </ElDescriptionsItem>
        <ElDescriptionsItem v-if="previewingItem.previewingSeason">
      <template #label>
        <span @click="copyEpisodesReplacer" style="cursor: pointer">节目文件名</span>
      </template>
      <div v-for="item in previewingItem.previewingSeason.episodeList">{{ item.fileNameWithName }}</div>
    </ElDescriptionsItem>
  </ElDescriptions>

  <template #footer>
      <span class="dialog-footer">
        <ElButton @click="model = false">关闭</ElButton>
        <ElButton v-show="previewing" type="primary" @click="previewing = false">
          返回
        </ElButton>
      </span>
  </template>
</ElDialog>`
}