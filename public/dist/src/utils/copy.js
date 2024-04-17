import { ElMessage } from '../import/element.js'

export const doCopy = (data) => {
  const tempInput = document.createElement('textarea')
  tempInput.value = data
  document.body.append(tempInput)
  tempInput.select()
  document.execCommand('copy')
  ElMessage.success('复制成功')
  tempInput.remove()
}