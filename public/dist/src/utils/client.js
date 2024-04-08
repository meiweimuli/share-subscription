import { ElMessage } from '../import/element.js'

const baseUrl = '/'
// const baseUrl = 'http://127.0.0.1:9999/'
export const client = axios.create({
  baseURL: baseUrl, timeout: 20000
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = token
  }
  return config
}, function(error) {
  return Promise.reject(error)
})

client.interceptors.response.use(function(response) {
  if (response.status !== 200) {
    ElMessage.error('接口请求失败')
    return
  }
  if (response.data?.code !== 200) {
    ElMessage.error(`接口请求失败, ${response.data?.message}`)
    return
  }
  return response.data
}, function(error) {
  console.log(error)
  ElMessage.error('接口请求失败')
})

export const tmdbClient = axios.create({
  timeout: 20000
})

tmdbClient.interceptors.request.use((config) => {
  const tmdbApiKey = localStorage.getItem('tmdb_token')
  config.params = Object.assign({ 'api_key': tmdbApiKey }, config.params)
  return config
}, function(error) {
  return Promise.reject(error)
})

tmdbClient.interceptors.response.use(function(response) {
  if (!(response.status === 200)) {
    ElMessage.error('接口请求失败')
    return undefined
  }
  return response.data || 'success'
}, function(error) {
  console.log(error)
  ElMessage.error('接口请求失败')
  return undefined
})