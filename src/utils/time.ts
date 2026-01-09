/**
 * 时间格式化工具函数
 */

/**
 * 格式化时间戳为 HH:MM 格式
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化的时间字符串
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 格式化音频时长
 * @param milliseconds 时长（毫秒）
 * @returns 格式化的时长字符串（如："1"23"）
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  return `${seconds}"`
}

/**
 * 格式化通话时长为 MM:SS 格式
 * @param seconds 时长（秒）
 * @returns 格式化的时长字符串
 */
export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 获取相对时间描述（如："刚刚"、"5分钟前"）
 * @param timestamp 时间戳（毫秒）
 * @returns 相对时间描述
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 60) {
    return '刚刚'
  } else if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return formatTime(timestamp)
  }
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化的日期字符串
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化完整日期时间为 YYYY-MM-DD HH:MM:SS 格式
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化的日期时间字符串
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
