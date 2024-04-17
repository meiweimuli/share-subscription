import { client } from '../../utils/client.js'
import { formatTime } from '../../utils/time.js'
import { FolderSelect } from '../../components/FolderSelect.js'
import { nextTick, ref, watch } from '../../import/vue.js'
import { ElMessage } from '../../import/element.js'

export const ShareSaverDialog = {
  components: { FolderSelect },
  props: ['modelValue'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => {
      model.value = props.modelValue
      if (!props.modelValue) {
        previewing.value = false
      }
    })
    watch(model, () => emit('update:modelValue', model.value))

    const saveInfo = ref({
      'disabled': false,
      'share_url': '',
      'share_secret': '',
      'target_folder_id': '',
      'match_regex': '',
      'replace_regex': '^.*?((?<![Ss\\d])(?!.*[Ee]\\d+)\\d\\d(?!\\d)|(?<=[Ee])\\d+).*?(\\.(?:mp4|mkv|(?:(?:[a-zA-Z]{2,3}\\.)?(?:ass|srt))))$',
      'rename_target': '',
      'ignore_same_name': true
    })

    const formRef = ref()
    const previewing = ref(false)
    const shareFiles = ref([])
    const tableRef = ref()

    const toPreview = async () => {
      try {
        await formRef.value.validate()
      } catch {
        return
      }

      const shareListResp = await client.post('api/share/list', {
        share_url: saveInfo.value.share_url,
        share_secret: saveInfo.value.share_secret
      })
      if (!shareListResp?.data) {
        return
      }
      shareFiles.value = shareListResp.data

      let matchRegex, replaceRegex
      try {
        matchRegex = new RegExp(saveInfo.value.match_regex)
        replaceRegex = new RegExp(saveInfo.value.replace_regex)
      } catch {
      }
      for (const shareFile of shareFiles.value) {
        shareFile.createTime = shareFile.created && dayjs(shareFile.created)
        shareFile.match = !!matchRegex && matchRegex.test(shareFile.name)
        if (shareFile.match && saveInfo.value.rename_target && replaceRegex) {
          try {
            shareFile.replaceName = shareFile.name.replace(replaceRegex, saveInfo.value.rename_target)
          } catch {
          }
        }
        shareFile.replaceName = shareFile.replaceName || shareFile.name
      }

      previewing.value = true
      await nextTick()
      for (const shareFile of shareFiles.value) {
        if (shareFile.match) {
          tableRef.value.toggleRowSelection(shareFile)
        }
      }
    }

    const selectFiles = ref([])
    const handleSelectionChange = async (selection) => {
      selectFiles.value = selection
    }

    const doSave = async () => {
      console.log(selectFiles.value)
      if (selectFiles.value.length === 0) {
        ElMessage.warning('没有选择文件')
        return
      }

      const shareSaveResp = await client.post('api/share/save', {
        share_url: saveInfo.value.share_url,
        share_secret: saveInfo.value.share_secret,
        save_folder_id: saveInfo.value.target_folder_id,
        ignore_same_name: saveInfo.value.ignore_same_name,
        files: selectFiles.value.map(item => ({
          file_id: item.id,
          origin_name: item.name,
          save_name: item.replaceName
        }))
      })
      if (shareSaveResp?.code === 200) {
        ElMessage.success('保存成功')
        saveInfo.value = {
          'disabled': false,
          'share_url': '',
          'share_secret': '',
          'target_folder_id': '',
          'match_regex': '',
          'replace_regex': '^.*?((?<![Ss\\d])(?!.*[Ee]\\d+)\\d\\d(?!\\d)|(?<=[Ee])\\d+).*?(\\.(?:mp4|mkv|(?:(?:[a-zA-Z]{2,3}\\.)?(?:ass|srt))))$',
          'rename_target': '',
          'ignore_same_name': true
        }
        model.value = false
      }
    }

    return {
      model,
      saveInfo,
      formRef,
      tableRef,
      toPreview,
      previewing,
      shareFiles,
      handleSelectionChange,
      formatTime,
      doSave
    }
  },
  template: `<ElDialog v-model="model" title="保存分享" width="95%">
  <ElForm v-show="!previewing" :model="saveInfo" label-width="120px" ref="formRef">
    <ElFormItem label="分享链接" prop="share_url"
                :rules="[{required: true, message: '分享链接不能为空', trigger: 'change'}]">
      <ElInput v-model="saveInfo.share_url"></ElInput>
    </ElFormItem>
    <ElFormItem label="分享密码" prop="share_secret">
      <ElInput v-model="saveInfo.share_secret"></ElInput>
    </ElFormItem>
    <ElFormItem label="保存目录" prop="target_folder_id"
                :rules="[{required: true, message: '保存目录不能为空', trigger: 'change'}]">
      <FolderSelect v-model="saveInfo.target_folder_id"></FolderSelect>
    </ElFormItem>
    <ElFormItem label="筛选正则" prop="match_regex">
      <ElInput v-model="saveInfo.match_regex"></ElInput>
    </ElFormItem>
    <ElFormItem label="重命名正则" prop="replace_regex">
      <ElInput v-model="saveInfo.replace_regex"></ElInput>
    </ElFormItem>
    <ElFormItem label="重命名" prop="rename_target">
      <ElInput v-model="saveInfo.rename_target"></ElInput>
    </ElFormItem>
    <ElFormItem label="忽略重名文件" prop="ignore_same_name">
      <ElSwitch v-model="saveInfo.ignore_same_name"></ElSwitch>
    </ElFormItem>
  </ElForm>
  <ElTable v-show="previewing" :data="shareFiles" @selection-change="handleSelectionChange"
           :row-class-name="(data) => data.row.match ? 'match-file' : ''" ref="tableRef">
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
  </ElTable>
  <template #footer>
    <span class="dialog-footer">
      <ElButton @click="model = false">取消</ElButton>
      <ElButton v-if="!previewing" type="primary" @click="toPreview">
        下一步
        </ElButton>
      <ElButton v-if="previewing" type="primary" @click="previewing = false">
        上一步
      </ElButton>
      <ElButton v-if="previewing" type="primary" @click="doSave">
        保存
      </ElButton>
    </span>
  </template>
</ElDialog>`
}