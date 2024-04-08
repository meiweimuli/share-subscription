import { client } from '../../utils/client.js'
import { style } from '../../utils/style.js'

import { CopyDialog, MkdirDialog, MoveDialog, RenameDialog } from './dialogs.js'
import { useRoute, useRouter } from '../../import/vue-router.js'
import { filesize } from '../../utils/filesize.js'

import { computed, ref, watch, onMounted } from '../../import/vue.js'
import { ElMessage } from '../../import/element.js'
import BatchRenameDialog from './BatchRenameDialog.js'

style(`
.yunpan-breadcrumb{
margin-bottom: 20px;
}

.yunpan-table-card{
margin-bottom: 150px;
}

.name-colum {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.yunpan-file-table .el-table__row {
    cursor: pointer;
}

.el-table .row-folder {
    --el-table-tr-bg-color: var(--el-color-warning-light-9);
}

.control-panel {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 20px;
    z-index: 100;
}
`)

export default {
  components: { CopyDialog, MkdirDialog, MoveDialog, RenameDialog, BatchRenameDialog },
  setup() {

    const router = useRouter()
    const route = useRoute()

    const filetypes = ['未知', '文件夹', '视频', '音频', '文本', '图片']

    const currentFolderId = computed(() => route.params.id || 'root')

    const currentFolder = ref({})
    watch(currentFolderId, async () => {
      const resp = await client.get('api/fs/get', { params: { file_id: currentFolderId.value } })
      if (resp?.code !== 200) {
        await router.replace('/yp')
        return
      }
      currentFolder.value = resp.data
    }, { immediate: true })


    const currentPath = ref([{ 'id': 'root', 'name': '资源库' }])

    watch(currentFolder, async () => {
      if (currentFolderId.value === 'root') {
        currentPath.value = [{ 'id': 'root', 'name': '资源库' }]
        return
      }
      const resp = await client.get('api/fs/path', { params: { file_id: currentFolderId.value } })
      if (resp?.code !== 200) {
        return
      }
      resp.data.reverse()
      currentPath.value = [{ 'id': 'root', 'name': '资源库' }, ...resp.data]
    })

    const currentFiles = ref([])
    const folderLoading = ref(false)

    async function loadFiles() {
      folderLoading.value = true
      const resp = await client.get('api/fs/list', { params: { folder_id: currentFolderId.value } })
      if (!resp?.data) {
        currentFiles.value = []
        folderLoading.value = false
        return
      }
      resp.data.forEach(item => item.readableSize = filesize(item.size))
      currentFiles.value = resp.data
      folderLoading.value = false
    }

    watch(currentFolder, loadFiles)

    const filter = ref({
      nameRegex: '',
      types: []
    })
    const filterFiles = computed(() => {
      let files = [...currentFiles.value]
      try {
        const nameRegex = RegExp(filter.value.nameRegex)
        files = files.filter(item => nameRegex.test(item.name))
      } catch {
        console.log('正则不合法')
      }
      if (filter.value.types.length > 0) {
        files = files.filter(item => filter.value.types.indexOf(item.type) > -1)
      }
      return files
    })

    const tableRef = ref()
    const canSelect = ref(false)
    const selection = ref([])
    const handleSelectionChange = (val) => {
      selection.value = val
    }
    watch(canSelect, () => tableRef.value.clearSelection())

    //新建文件夹
    async function openMkdirDialog() {
      showMkdirDialog.value = true
    }

    //重命名
    const renameFileId = ref('')
    const renamePrevName = ref('')

    async function openRenameDialog(file) {
      renameFileId.value = file.id
      renamePrevName.value = file.name
      showRenameDialog.value = true
    }

    // async function openRenameDialog() {
    //   if (selection.value.length === 0) {
    //     ElMessage.warning('未选择文件')
    //     return
    //   }
    //   const file = selection.value[0]
    //   renameFileId.value = file.id
    //   renamePrevName.value = file.name
    //   showRenameDialog.value = true
    // }

    //删除
    async function doDelete() {
      if (selection.value.length === 0) {
        ElMessage.warning('未选择文件')
        return
      }
      const fileIds = selection.value.map(item => item.id)
      const resp = await client.post('api/fs/remove', { file_ids: fileIds })
      if (resp?.code !== 200) {
        return
      }
      ElMessage.success('删除成功')
      await loadFiles()
    }

    //移动
    const moveFileIds = ref([])

    async function openMoveDialog() {
      if (selection.value.length === 0) {
        ElMessage.warning('未选择文件')
        return
      }
      moveFileIds.value = selection.value.map(item => item.id)
      showMoveDialog.value = true
    }

    //复制
    const copyFileIds = ref([])

    async function openCopyDialog() {
      if (selection.value.length === 0) {
        ElMessage.warning('未选择文件')
        return
      }
      copyFileIds.value = selection.value.map(item => item.id)
      showCopyDialog.value = true
    }

    //批量重命名
    const batchRenameFiles = ref([])

    async function openBatchRenameDialog() {
      if (filterFiles.value.length === 0) {
        ElMessage.warning('没有文件')
      }
      if (selection.value.length > 0) {
        batchRenameFiles.value = selection.value.map(item => ({ id: item.id, name: item.name }))
      } else {
        batchRenameFiles.value = filterFiles.value.map(item => ({ id: item.id, name: item.name }))
      }

      showBatchRenameDialog.value = true
    }

    const showMkdirDialog = ref(false)
    const showRenameDialog = ref(false)
    const showMoveDialog = ref(false)
    const showCopyDialog = ref(false)
    const showBatchRenameDialog = ref(false)

    watch([showMkdirDialog, showRenameDialog, showMoveDialog, showCopyDialog, showBatchRenameDialog], (a) => {
      if (a.every(item => !item)) {
        loadFiles().then()
      }
    })

    return {
      filetypes,

      router,

      currentFolderId,
      currentPath,
      currentFiles,
      folderLoading,

      filter,
      filterFiles,

      tableRef,
      canSelect,
      selection,
      handleSelectionChange,

      doDelete,

      renameFileId,
      renamePrevName,
      moveFileIds,
      copyFileIds,
      batchRenameFiles,
      openMkdirDialog,
      openRenameDialog,
      openMoveDialog,
      openCopyDialog,
      openBatchRenameDialog,
      showMkdirDialog,
      showRenameDialog,
      showMoveDialog,
      showCopyDialog,
      showBatchRenameDialog
    }
  },
  template: `<MkdirDialog v-model="showMkdirDialog" :folderId="currentFolderId" />
<RenameDialog v-model="showRenameDialog" :fileId="renameFileId" :prevName="renamePrevName" />
<MoveDialog v-model="showMoveDialog" :fileIds="moveFileIds" />
<CopyDialog v-model="showCopyDialog" :fileIds="copyFileIds" />
<BatchRenameDialog v-model="showBatchRenameDialog" :files="batchRenameFiles" />
<ElCard class="control-panel">
  <ElButton @click="openMkdirDialog">新建文件夹</ElButton>
  <ElButton @click="openBatchRenameDialog">重命名</ElButton>
  <ElButton @click="openMoveDialog">移动</ElButton>
  <ElButton @click="openCopyDialog">复制</ElButton>
  <ElPopconfirm title="确定删除?" @confirm.prevent="doDelete()">
    <template #reference>
      <el-button type="warning">
        删除
      </el-button>
    </template>
  </ElPopconfirm>
</ElCard>

<ElCard class="yunpan-table-card">
  <ElBreadcrumb class="yunpan-breadcrumb">
    <ElBreadcrumbItem v-for="(item) in currentPath" :to="item.id !== 'root' ? '/yp/' + item.id : '/yp'">
      <span class="breadcrumb">{{ item.name }}</span>
    </ElBreadcrumbItem>
  </ElBreadcrumb>
  <ElForm :inline="true" label-width="auto">
    <ElFormItem label="名称">
      <el-input v-model="filter.nameRegex"></el-input>
    </ElFormItem>
    <ElFormItem label="文件类型">
      <ElSelect v-model="filter.types" multiple placeholder="文件类型" width="200px">
        <ElOption v-for="(filetype,index) in filetypes" :key="index" :label="filetype" :value="index" />
      </ElSelect>
    </ElFormItem>
    <ElFormItem label="多选框">
      <ElSwitch v-model="canSelect"></ElSwitch>
    </ElFormItem>
  </ElForm>
  <ElTable :data="filterFiles" v-loading="folderLoading" style="width: 100%"
           @row-click="row => row.type === 1 && router.push('/yp/' + row.id)"
           @selection-change="handleSelectionChange"
           :row-class-name="(item) => item.row.type === 1 ? 'row-folder' : ''"
           class="yunpan-file-table"
           ref="tableRef">
    <ElTableColumn v-if="canSelect" type="selection" width="55"></ElTableColumn>
    <ElTableColumn label="名称" sortable :sort-method="(a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')">
      <template #default="{row}">
        <div class="name-column" @click="canSelect && tableRef.toggleRowSelection(row)">
          {{ row.name }}
        </div>
      </template>
    </ElTableColumn>
    <ElTableColumn label="类型" width="100" sortable sort-by="type">
      <template #default="{row}">
        <div>{{ filetypes[row.type] }}</div>
      </template>
    </ElTableColumn>
    <ElTableColumn label="大小" width="100" sortable sort-by="size">
      <template #default="{row}">
        <div>{{ row.type !== 1 ? row.readableSize : '-' }}</div>
      </template>
    </ElTableColumn>
    <ElTableColumn fixed="right" label="操作" width="100">
      <template #default="{row}">
        <ElButton link type="primary" size="small" @click.prevent.stop="openRenameDialog(row)">
          重命名
        </ElButton>
      </template>
    </ElTableColumn>
  </ElTable>
</ElCard>
`
}