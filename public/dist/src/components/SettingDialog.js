import { ref, watch } from '../import/vue.js'

export const SettingDialog = {
  props: ['modelValue'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    const token = ref(localStorage.getItem('token'))
    watch(token, v => localStorage.setItem('token', v))

    const tmdbToken = ref(localStorage.getItem('tmdb_token'))
    watch(tmdbToken, v => localStorage.setItem('tmdb_token', v))

    return {
      model,
      token,
      tmdbToken
    }
  },
  template: `
<ElDialog v-model="model" title="配置" width="95%">
  <div>
    <ElForm :inline="true">
      <ElFormItem label="Token">
        <ElInput v-model="token"/>
      </ElFormItem>
      <ElFormItem label="TMDB API KEY">
        <ElInput v-model="tmdbToken"/>
      </ElFormItem>
    </ElForm>
  </div>
</ElDialog>`
}