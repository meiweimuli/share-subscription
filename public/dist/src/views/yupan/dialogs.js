import { client } from '../../utils/client.js'
import { FolderSelect } from '../../components/FolderSelect.js'

import { ref, watch, computed } from '../../import/vue.js'
import { ElMessage } from '../../import/element.js'

export const CopyDialog = {
  components: { FolderSelect },
  props: ['modelValue', 'fileIds'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    const folderId = ref('')

    async function doCopy() {
      const resp = await client.post('api/fs/copy', { dst_folder_id: folderId.value, file_ids: props.fileIds })
      if (resp?.code !== 200) {
        return
      }
      ElMessage.success('复制成功')
      model.value = false
    }

    return {
      model,
      folderId,
      doCopy
    }
  },
  template: `
<ElDialog v-model="model" title="复制">
  <ElForm>
    <ElFormItem label="文件夹">
      <FolderSelect v-model="folderId" :prohibit-folder-ids="fileIds" />
    </ElFormItem>
  </ElForm>
  <template #footer>
    <ElButton @click="model = false">取消</ElButton>
    <ElButton :disabled="!folderId" @click="doCopy" type="primary">
      复制
    </ElButton>
  </template>
</ElDialog>
`
}

export const MkdirDialog = {
  props: ['modelValue', 'folderId'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    const name = ref('')
    const names = computed(() => name.value.split('\n').map(item => item.trim()).filter(item => item))

    async function doMkdir() {

      const saveNames = Array.from(new Set(names.value))
      const failedNames = []
      for (let saveName of saveNames) {
        const resp = await client.post('api/fs/mkdir', { parent_id: props.folderId, dir_name: saveName })
        if (resp?.code !== 200) {
          failedNames.push(saveName)
        }
      }

      if (failedNames.length > 0) {
        ElMessage.warning('未全部保存成功')
        name.value = failedNames.join('\n')
        return
      }
      ElMessage.success('创建成功')
      name.value = ''
      model.value = false
    }

    return {
      model,
      name,
      names,
      doMkdir
    }
  },
  template: `
<ElDialog v-model="model" title="新建文件夹" width="80%">
  <ElForm>
    <ElFormItem label="名称">
      <ElInput type="textarea" v-model="name" :autosize="{ minRows: 3, maxRows: 10 }" />
    </ElFormItem>
  </ElForm>
  <template #footer>
    <ElButton @click="model = false">取消</ElButton>
    <ElButton :disabled="names.length === 0" @click="doMkdir" type="primary">
      保存
    </ElButton>
  </template>
</ElDialog>
`
}


export const MoveDialog = {
  components: { FolderSelect },
  props: ['modelValue', 'fileIds'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    const folderId = ref('')

    async function doMove() {
      const resp = await client.post('api/fs/move', { dst_folder_id: folderId.value, file_ids: props.fileIds })
      if (resp?.code !== 200) {
        return
      }
      ElMessage.success('移动成功')
      model.value = false
    }

    return {
      model,
      folderId,
      doMove
    }
  },
  template: `
<ElDialog v-model="model" title="移动">
  <ElForm>
    <ElFormItem label="文件夹">
      <FolderSelect v-model="folderId" :prohibit-folder-ids="fileIds" />
    </ElFormItem>
  </ElForm>
  <template #footer>
    <ElButton @click="model = false">取消</ElButton>
    <ElButton :disabled="!folderId" @click="doMove" type="primary">
      移动
    </ElButton>
  </template>
</ElDialog>
`
}


export const RenameDialog = {
  props: ['modelValue', 'fileId', 'prevName'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => {
      model.value = props.modelValue
      if (props.modelValue) {
        name.value = props.prevName
      }
    })
    watch(model, () => emit('update:modelValue', model.value))

    const name = ref(props.prevName)

    async function doRename() {

      const resp = await client.post('api/fs/rename', { file_id: props.fileId, name: name.value })
      if (resp?.code !== 200) {
        return
      }
      ElMessage.success('重命名成功')
      model.value = false
    }

    return {
      model,
      name,
      doRename
    }
  },
  template: `
<ElDialog v-model="model" title="重命名">
    <ElForm>
      <ElFormItem label="名称">
        <ElInput v-model="name" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="model = false">取消</ElButton>
      <ElButton :disabled="!name || name === prevName" @click="doRename" type="primary">
        保存
      </ElButton>
    </template>
  </ElDialog>
`
}