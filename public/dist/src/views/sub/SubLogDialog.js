import { client } from '../../utils/client.js'

import { ref, watch } from '../../import/vue.js'

export const SubLogDialog = {
  props: ['modelValue', 'prohibitFolderIds'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => {
      model.value = props.modelValue
      if (props.modelValue) {
        loadLogList().then()
      }
    })
    watch(model, () => emit('update:modelValue', model.value))

    const loading = ref(false)
    const logList = ref([])

    async function loadLogList() {
      loading.value = true
      const resp = await client.get('api/sub/log/list?per_page=100')
      if (resp?.data) {
        logList.value = resp?.data.content
      }
      loading.value = false
    }

    const formatTime = (time) => {
      return time ? dayjs(time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') : ''
    }

    return {
      model,
      loading,
      logList,
      loadLogList,
      formatTime
    }
  },
  template: `
<ElDialog v-model="model" title="记录" width="95%">
  <div>
    <ElForm :inline="true">
      <ElFormItem>
        <el-button type="primary" @click="loadLogList">
          刷新
        </el-button>
      </ElFormItem>
    </ElForm>
    <ElCard>
      <ElTable :data="logList" v-loading="loading" style="width: 100%">
        <ElTableColumn label="时间" width="200">
          <template #default="{row}">
            {{ formatTime(row.log_time) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="信息">
          <template #default="{row}">
            {{ row.message }}
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>
  </div>
  <template #footer>
    <span class="dialog-footer">
      <ElButton @click="model = false">取消</ElButton>
    </span>
  </template>
</ElDialog>`
}