import { formatTime } from '../../utils/time.js'
import { computed, ref, watch, nextTick } from '../../import/vue.js'
import { client } from '../../utils/client.js'
import { ElMessage } from '../../import/element.js'

export default {
  props: ['modelValue', 'files'],
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

    const matchInfo = ref('')
    const replaceOnce = ref(false)
    const matchPairList = computed(() => {
      const matchInfoList = matchInfo.value.split('\n\n')
      return matchInfoList.map(item => {
        const matchPair = item.split('\n').map(item => item.trim()).filter(item => item)
        return matchPair.length >= 2 ? matchPair.slice(0, 2) : undefined
      }).filter(item => item)
    })

    const previewing = ref(false)
    const replaceFiles = ref([])
    const tableRef = ref()

    const toPreview = async () => {

      console.log(matchPairList.value)
      const matchPairs = matchPairList.value.map(item => {
        try {
          return [new RegExp(item[0]), item[1]]
        } catch {
        }
      }).filter(item => item)

      const replaceFileList = []
      for (let file of props.files) {
        for (let matchPair of matchPairs) {
          if (matchPair[0].test(file.name)) {
            replaceFileList.push({
              ...file, replaceName: file.name.replace(matchPair[0], matchPair[1])
            })
            break
          }
        }
      }
      replaceFiles.value = replaceFileList

      console.log(replaceFileList)

      previewing.value = true
      await nextTick()
      for (const replaceFile of replaceFiles.value) {
        tableRef.value.toggleRowSelection(replaceFile)
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

      let success = true
      for (let selectFile of selectFiles.value) {
        const resp = await client.post('api/fs/rename', { file_id: selectFile.id, name: selectFile.replaceName })
        if (resp?.code !== 200) {
          success = false
          break
        }
        selectFile.renameSuccess = true
      }

      if (success) {
        ElMessage.success('修改成功')
        model.value = false
        matchInfo.value = ''
      }

      for (let selectFile of selectFiles.value) {
        if (selectFile.renameSuccess) {
          tableRef.value.toggleRowSelection(selectFile)
        }
      }

    }

    return {
      model,
      matchInfo,
      tableRef,
      toPreview,
      previewing,
      replaceFiles,
      handleSelectionChange,
      formatTime,
      doSave
    }
  },
  template: `<ElDialog v-model="model" title="保存分享" width="95%">
  <ElForm v-show="!previewing" :model="matchInfo" label-width="120px" ref="formRef">
    <ElFormItem label="正则+替换" prop="matchInfo">
      <ElInput type="textarea" v-model="matchInfo" :autosize="{ minRows: 9, maxRows: 20 }"/>
    </ElFormItem>
  </ElForm>
  <ElTable v-show="previewing" :data="replaceFiles" @selection-change="handleSelectionChange"
           :row-class-name="(data) => data.row.match ? 'match-file' : ''" ref="tableRef">
    <ElTableColumn type="selection" width="55"></ElTableColumn>
    <ElTableColumn label="名称" sortable :sort-method="(a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')">
      <template #default="{row}">
        {{ row.name }}
      </template>
    </ElTableColumn>
    <ElTableColumn label="保存名称" prop="replaceName" sortable :sort-method="(a, b) => a.replaceName.localeCompare(b.replaceName, 'zh-Hans-CN')"></ElTableColumn>
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