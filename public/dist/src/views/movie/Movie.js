import { tmdbClient } from '../../utils/client.js'
import { ref, computed } from '../../import/vue.js'

import { ElMessage } from '../../import/element.js'

export default {
  setup() {

    const movieList = ref([])

    const query = ref('')
    const querying = ref(false)
    const doQuery = async () => {
      querying.value = true
      const result = await tmdbClient.get('https://api.themoviedb.org/3/search/movie', { params: { query: query.value } })
      movieList.value = result.results
      querying.value = false

      for (const movie of movieList.value) {
        (async () => {
          const id = movie.id
          const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${id}/external_ids`)
          const translations = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${id}/translations`)
          movie.external_ids = externalIds
          movie.translations = translations?.translations ?? []
          movie.chinese_title = movie.translations.find(item => item.iso_3166_1 === 'CN')?.data?.title
            || movie.translations.find(item => item.iso_3166_1 === 'SG')?.data?.title
            || (movie.original_language === 'zh' && movie.original_title) || ''
        })()
      }
    }

    const doCopy = (data) => {
      const tempInput = document.createElement('input')
      tempInput.value = data
      document.body.append(tempInput)
      tempInput.select()
      document.execCommand('copy')
      ElMessage.success('复制成功')
      tempInput.remove()
    }

    const imdbIdQuery = ref('')
    const movieDetail = ref({})
    const movieFolderName = computed(() => {
      const detail = movieDetail.value
      const imdbFragment = detail.external_ids?.imdb_id ? ` {imdb-${detail.external_ids?.imdb_id}}` : ''
      return detail.id ? `${detail.chinese_title} (${detail.release_date?.substring(0, 4) ?? ''}) {tmdb-${detail.id}}${imdbFragment} [${detail.original_title ?? ''}] [${detail.title ?? ''}]` : ''
    })
    const searchingmovie = ref(false)
    const doImdbIdQuery = async () => {
      const findResult = await tmdbClient.get(`https://api.themoviedb.org/3/find/${imdbIdQuery.value}?external_source=imdb_id`)
      const movieId = findResult?.movie_results?.[0]?.id
      if (!movieId) {
        ElMessage.error('没有找到')
        return
      }
      selectmovie(movieId)
    }
    const selectmovie = async (id) => {
      searchingmovie.value = true
      const movie = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${id}`)
      const externalIds = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${id}/external_ids`)
      const translations = await tmdbClient.get(`https://api.themoviedb.org/3/movie/${id}/translations`)
      movie.external_ids = externalIds
      movie.translations = translations?.translations ?? []
      movie.chinese_title = movie.translations.find(item => item.iso_3166_1 === 'CN')?.data?.title
        || movie.translations.find(item => item.iso_3166_1 === 'SG')?.data?.title
        || (movie.original_language === 'zh' && movie.original_title) || ''
      movieDetail.value = movie
      searchingmovie.value = false
    }

    return {
      movieList,
      query,
      querying: querying,
      doQuery,
      doCopy,

      imdbIdQuery,
      searchingmovie,
      selectmovie,
      movieDetail,
      doImdbIdQuery,
      movieFolderName
    }
  },
  template: `
  <ElCard>
    <div>
      <ElFormItem label="imdbId查询">
        <ElInput v-model="imdbIdQuery"
                  @keyup.enter.native="doImdbIdQuery"></ElInput>
      </ElFormItem>
      <ElFormItem>
        <el-button type="primary" :disabled="!imdbIdQuery" @click="doImdbIdQuery">查询</el-button>
      </ElFormItem>

      <ElDescriptions class="margin-top" title="电影" :column="1" border :loading="searchingmovie">
        <ElDescriptionsItem>
          <template #label>
            电影文件夹
          </template>
          <div @click="doCopy(movieFolderName)">{{ movieFolderName }}</div>
        </ElDescriptionsItem>
      </ElDescriptions>

    </div>
  </ElCard>
  <ElCard>
    <div>
      <!-- <ElFormItem label="ApiKey"> <ElInput v-model="apiKey"></ElInput></ElFormItem> -->
      <ElFormItem label="文本查询">
        <ElInput v-model="query" @keyup.enter.native="doQuery"></ElInput>
      </ElFormItem>
      <ElFormItem>
        <el-button type="primary" :disabled="!query" @click="doQuery">查询</el-button>
      </ElFormItem>
      <ElTable :data="movieList" v-loading="querying">
        <ElTableColumn prop="title" label="英文标题">
          <template v-slot="{row}">
            <div @click="doCopy(row.title)">{{ row.title }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="original_title" label="原始标题">
          <template v-slot="{row}">
            <div @click="doCopy(row.original_title)">{{ row.original_title }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="chinese_title" label="中文标题">
          <template v-slot="{row}">
            <div @click="doCopy(row.chinese_title)">{{ row.chinese_title }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="release_date" label="年份"></ElTableColumn>
        <ElTableColumn prop="external_ids.imdb_id" label="imdbId">
          <template v-slot="{row}">
            <div @click="doCopy(row.external_ids?.imdb_id)">{{ row.external_ids?.imdb_id }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn fixed="right" label="操作" width="120">
          <template v-slot="{row}">
            <el-button link type="primary" size="small" @click.prevent="selectmovie(row.id)">
              查看
            </el-button>
          </template>
        </ElTableColumn>
      </ElTable>

    </div>
  </ElCard>
`
}