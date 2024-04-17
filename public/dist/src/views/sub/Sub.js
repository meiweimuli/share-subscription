import { cloneDeep } from '../../../assets/js/lodash-es.js'
import { FolderSelect } from '../../components/FolderSelect.js'
import { client } from '../../utils/client.js'
import { ShareSaverDialog } from './ShareSaverDialog.js'
import { SubLogDialog } from './SubLogDialog.js'
import { formatTime } from '../../utils/time.js'
import { SettingDialog } from '../../components/SettingDialog.js'
import { style } from '../../utils/style.js'
import { filesize } from '../../utils/filesize.js'

import { computed, ref, watch, onMounted, nextTick, inject } from '../../import/vue.js'
import { ElMessage } from '../../import/element.js'
import SearchDialog from '../../components/SearchDialog.js'

style(`
.match-file {
    --el-table-tr-bg-color: var(--el-color-success-light-8);
}

.share_url_invalid {
    --el-table-tr-bg-color: var(--el-color-danger-light-8);
}
`)

export default {
  components: { FolderSelect, ShareSaverDialog, SubLogDialog, SettingDialog, SearchDialog },
  setup() {

    //列表
    const loading = ref(false)
    const subscriptionList = ref([])

    async function loadSubscriptionList() {
      loading.value = true
      const resp = await client.get('api/sub/list?per_page=100000')
      if (resp?.data?.content) {
        for (let sub of resp.data.content) {
          sub.lastQueryTime = sub.last_query_time && dayjs(sub.last_query_time)
        }
        subscriptionList.value = resp.data.content
      } else {
        subscriptionList.value = []
      }
      loading.value = false
    }

    onMounted(loadSubscriptionList)

    //切换是否启用
    async function changeDisabled(subscription, disabled) {
      if (disabled) {
        await client.post(`api/sub/disable?id=${subscription.id}`)
      } else {
        await client.post(`api/sub/enable?id=${subscription.id}`)
      }
    }

    //修改、添加
    const editing = ref(false)
    const editingSubscription = ref()
    const saveFormRef = ref()

    const toAdd = async () => {
      editingSubscription.value = {
        'name': '',
        'disabled': true,
        'share_url': '',
        'share_secret': '',
        'target_folder_id': '',
        'match_regex': '',
        'replace_regex': '^.*?((?<![Ss\\d])(?!.*[Ee]\\d+)\\d\\d(?!\\d)|(?<=[Ee])\\d+).*?(\\.(?:mp4|mkv|(?:(?:[a-zA-Z]{2,3}\\.)?(?:ass|srt))))$',
        'rename_target': '',
        'ignore_same_name': true
      }
      editing.value = true
    }

    const toEdit = async (subscription) => {
      editingSubscription.value = cloneDeep(subscription)
      editing.value = true
    }

    const doSave = async () => {
      console.log(editingSubscription.value)

      try {
        await saveFormRef.value.validate()
      } catch {
        return
      }

      const saveUrl = editingSubscription.value.id ? 'api/sub/update' : 'api/sub/create'

      const resp = await client.post(saveUrl, editingSubscription.value)
      if (resp?.code !== 200) {
        return
      }
      ElMessage.success('保存成功')
      editing.value = false
      await loadSubscriptionList()
    }

    //删除
    const doDelete = async (subscription) => {
      const resp = await client.post(`api/sub/delete?id=${subscription.id}`)
      if (!resp) {
        return
      }
      ElMessage.success('删除成功')
      await loadSubscriptionList()
    }

    //执行
    async function execSub(subscription) {
      const resp = await client.post(`api/sub/exec?id=${subscription.id}`)
      if (resp?.code === 200) {
        ElMessage.success('执行成功')
      }
      await loadSubscriptionList()
    }

    //预览
    const previewing = ref(false)
    const previewingSubscription = ref()
    const shareFiles = ref([])
    const savedFiles = ref([])
    const previewTable = ref()
    const toPreview = async (subscription) => {
      const subGetResp = await client.get(`api/sub/get?id=${subscription.id}`)
      subscription = subGetResp?.data
      if (!subscription) {
        return
      }
      console.log(subscription.disabled)
      if (!subscription.disabled) {
        ElMessage.warning('关闭的任务才能预览')
        return
      }

      previewingSubscription.value = subscription
      shareFiles.value = []
      previewing.value = true

      const shareListResp = await client.post('api/share/list', {
        share_url: subscription.share_url,
        share_secret: subscription.share_secret
      })
      if (!shareListResp?.data) {
        return
      }
      shareFiles.value = shareListResp.data

      let matchRegex, replaceRegex
      try {
        matchRegex = new RegExp(subscription.match_regex)
        replaceRegex = new RegExp(subscription.replace_regex)
      } catch {
      }
      for (const shareFile of shareFiles.value) {
        shareFile.readableSize = filesize(shareFile.size)
        shareFile.createTime = shareFile.created && dayjs(shareFile.created)
        shareFile.match = !!matchRegex && matchRegex.test(shareFile.name)
        if (shareFile.match && subscription.rename_target && replaceRegex) {
          try {
            shareFile.replaceName = shareFile.name.replace(replaceRegex, subscription.rename_target)
          } catch {
          }
        }
        shareFile.replaceName = shareFile.match ? shareFile.replaceName || shareFile.name : '-'
      }
      await nextTick()
      const savedFileIds = subscription.saved_file_ids.split(',')
      for (const shareFile of shareFiles.value) {
        if (savedFileIds.indexOf(shareFile.id) > -1) {
          previewTable.value.toggleRowSelection(shareFile)
        }
      }
    }

    const handleSelectionChange = async (selection) => {
      savedFiles.value = selection
    }

    const saveSavedFiles = async () => {
      console.log(savedFiles.value.map(item => item.id).join(','))
      previewingSubscription.value.saved_file_ids = savedFiles.value.map(item => item.id).join(',')
      const resp = await client.post('api/sub/update', previewingSubscription.value)
      if (!resp) {
        return
      }
      ElMessage.success('保存成功')
      previewing.value = false
    }

    //分享保存
    const showShareSaverDialog = ref(false)
    //记录
    const showSubLogDialog = ref(false)

    const { openSearchDialog } = inject('openSearchDialog')

    return {
      loading,
      subscriptionList,
      loadSubscriptionList,
      changeDisabled,

      execSub,

      toAdd,
      toEdit,
      editing,
      editingSubscription,
      saveFormRef,
      doSave,

      doDelete,

      toPreview,
      previewing,
      shareFiles,
      savedFiles,
      previewTable,
      handleSelectionChange,
      saveSavedFiles,

      showShareSaverDialog,
      showSubLogDialog,
      openSearchDialog,

      formatTime
    }
  },
  template: `<ElCard>
  <ElForm :inline="true">
    <ElFormItem>
      <ElButton type="primary" @click="loadSubscriptionList">
        刷新
      </ElButton>
      <ElButton type="primary" @click="toAdd">
        新增
      </ElButton>
      <ElButton type="primary" @click="showShareSaverDialog = true">
        分享保存
      </ElButton>
      <ElButton type="primary" @click="showSubLogDialog = true">
        记录
      </ElButton>
    </ElFormItem>
  </ElForm>
  <ElTable :data="subscriptionList" v-loading="loading" style="width: 100%"
           :row-class-name="(data) => data.row.share_url_invalid ? 'share_url_invalid' : ''">
    <ElTableColumn label="名称" sortable sort-by="name" min-width="100">
      <template #default="{row}">
        {{ row.name }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="上次执行时间" sortable sort-by="lastQueryTime" width="200">
      <template #default="{row}">
        {{ formatTime(row.lastQueryTime) }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="是否启用" sortable sort-by="disabled" width="150">
      <template #default="{row}">
        <ElSwitch v-model="row.disabled" @change="v => changeDisabled(row,v)"
                  style="--el-switch-on-color:#ff4949; --el-switch-off-color:#13ce66"></ElSwitch>
      </template>
    </ElTableColumn>
    <ElTableColumn fixed="right" label="操作">
      <template #default="{row}">
        <ElButton link type="primary" size="small" @click.prevent="execSub(row)">
          执行
        </ElButton>
        <ElButton link type="primary" size="small" @click.prevent="toPreview(row)">
          预览
        </ElButton>
        <ElButton link type="primary" size="small" @click.prevent="toEdit(row)">
          编辑
        </ElButton>
        <el-popconfirm title="确定删除?" @confirm.prevent="doDelete(row)">
          <template #reference>
            <ElButton link type="primary" size="small">
              删除
            </ElButton>
          </template>
        </el-popconfirm>
      </template>
    </ElTableColumn>
  </ElTable>
</ElCard>

<ElDialog v-model="editing" :title="editingSubscription?.id ? '修改' : '新增'" @close="editingSubscription = {}">
  <ElForm :model="editingSubscription" ref="saveFormRef" label-width="120px">
    <ElFormItem label="标题" prop="name"
                :rules="[{required: true, message: '标题不能为空', trigger: 'change'}]">
      <ElInput v-model="editingSubscription.name"></ElInput>
    </ElFormItem>
    <ElFormItem label="分享链接" prop="share_url"
                :rules="[{required: true, message: '分享链接不能为空', trigger: 'change'}]">
      <ElInput v-model="editingSubscription.share_url"></ElInput>
    </ElFormItem>
    <ElFormItem label="分享密码" prop="share_secret">
      <ElInput v-model="editingSubscription.share_secret"></ElInput>
    </ElFormItem>
    <ElFormItem label="保存目录" prop="target_folder_id"
                :rules="[{required: true, message: '保存目录不能为空', trigger: 'change'}]">
      <folder-select v-model="editingSubscription.target_folder_id"></folder-select>
    </ElFormItem>
    <ElFormItem label="筛选正则" prop="match_regex">
      <ElInput v-model="editingSubscription.match_regex"></ElInput>
    </ElFormItem>
    <ElFormItem label="重命名正则" prop="replace_regex">
      <ElInput v-model="editingSubscription.replace_regex"></ElInput>
    </ElFormItem>
    <ElFormItem label="重命名" prop="rename_target">
      <ElInput v-model="editingSubscription.rename_target"></ElInput>
    </ElFormItem>
    <ElFormItem label="忽略重名文件" prop="ignore_same_name">
      <ElSwitch v-model="editingSubscription.ignore_same_name"></ElSwitch>
    </ElFormItem>
  </ElForm>
  <template #footer>
    <span class="dialog-footer">
    <ElButton @click="openSearchDialog">搜索</ElButton>
      <ElButton @click="editing = false">取消</ElButton>
      <ElButton type="primary" @click="doSave">
        保存
      </ElButton>
    </span>
  </template>
</ElDialog>
<ElDialog v-model="previewing" title="文件预览" width="95%">
  <ElTable :data="shareFiles" @selection-change="handleSelectionChange"
           :row-class-name="(data) => data.row.match ? 'match-file' : ''" ref="previewTable">
    <ElTableColumn type="selection" width="55"></ElTableColumn>
    <ElTableColumn label="名称" sortable :sort-method="(a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')">
      <template #default="{row}">
        {{ row.name }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="保存名称" prop="replaceName" sortable
                   :sort-method="(a, b) => a.replaceName.localeCompare(b.replaceName, 'zh-Hans-CN')"></ElTableColumn>
    <ElTableColumn label="创建时间" sortable sort-by="created" width="200">
      <template #default="{row}">
        {{ formatTime(row.created) }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="大小" prop="readableSize" sortable sort-by="size" width="200"></ElTableColumn>
  </ElTable>
  <template #footer>
    <span class="dialog-footer">
    
      <ElButton @click="previewing = false">取消</ElButton>
      <ElButton type="primary" @click="saveSavedFiles">
        保存
      </ElButton>
    </span>
  </template>
</ElDialog>
<ShareSaverDialog v-model="showShareSaverDialog"></ShareSaverDialog>
<SubLogDialog v-model="showSubLogDialog"></SubLogDialog>
`
}