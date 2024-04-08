export const base = {
  props: ['modelValue'],
  emit: ['update:modelValue'],
  setup(props, { emit }) {
    const model = ref(props.modelValue)
    watch(() => props.modelValue, () => model.value = props.modelValue)
    watch(model, () => emit('update:modelValue', model.value))

    return {
      model
    }
  },
  template: `
      <div></div>
`
}