import { client } from '../utils/client.js'

import { ref, watch } from '../import/vue.js'

export const FolderSelect = {
  props: ['modelValue', 'prohibitFolderIds'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))
    const load = async (node, resolve) => {
      if (node.level === 0) {
        return resolve([{ id: 'root', name: '资源库', value: 'root' }])
      }
      if (!node?.data?.id) {
        return resolve([])
      }
      const resp = await client.post('api/fs/dirs', { folder_id: node.data.id })
      if (resp?.code !== 200 || !resp.data) {
        return resolve([])
      }
      resp.data.forEach(item => {
        item.value = item.id
        item.disabled = props.prohibitFolderIds && props.prohibitFolderIds.indexOf(item.id) > -1
        if (item.disabled) {
          item.leaf = true
        }
      })
      resolve(resp.data)
    }
    return {
      model,
      load
    }
  },
  template: `
      <ElTreeSelect
          v-model="model"
          lazy
          accordion
          check-strictly
          :load="load"
          :props="{label:'name',isLeaf: 'leaf'}"
          fit-input-width
      />`
}