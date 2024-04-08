export function formatTime(time) {
  return time ? dayjs(time).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss') : ''
}