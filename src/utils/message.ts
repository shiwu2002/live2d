/**
 * 消息处理工具函数
 */
import type { ChatMessage, MessageType } from '../services/websocket'
import type { ExtendedChatMessage } from '../types/chat'

/**
 * 可在界面显示的消息类型
 */
export const DISPLAYABLE_MESSAGE_TYPES: MessageType[] = ['TEXT', 'IMAGES', 'AUDIO']

/**
 * 类型守卫：判断消息是否为可显示的消息类型
 * @param msg 聊天消息
 * @returns 是否为可显示消息
 */
export function isDisplayableMessage(msg: ChatMessage): msg is ExtendedChatMessage {
  return DISPLAYABLE_MESSAGE_TYPES.includes(msg.type)
}

/**
 * 获取文本内容
 * @param content 消息内容
 * @returns 文本字符串
 */
export function getTextContent(content: string | object): string {
  if (typeof content === 'string') {
    return content
  }
  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content)
  }
  return ''
}

/**
 * 获取图片URL列表
 * @param content 消息内容
 * @returns 图片URL数组
 */
export function getImageUrls(content: string | object): string[] {
  try {
    if (typeof content === 'string') {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.images)) {
        return parsed.images
      }
      // 如果直接是数组
      if (Array.isArray(parsed)) {
        return parsed
      }
    } else if (typeof content === 'object' && content !== null) {
      const obj = content as any
      if (Array.isArray(obj.images)) {
        return obj.images
      }
      if (Array.isArray(obj.urls)) {
        return obj.urls
      }
      // 如果content本身就是数组
      if (Array.isArray(content)) {
        return content as string[]
      }
    }
  } catch (e) {
    console.error('解析图片内容失败:', e)
  }
  return []
}

/**
 * 获取控制消息文本
 * @param content 消息内容
 * @returns 控制消息文本
 */
export function getControlText(content: string | object): string {
  try {
    if (typeof content === 'string') {
      const parsed = JSON.parse(content)
      return parsed.command || content
    } else if (typeof content === 'object' && content !== null) {
      const obj = content as any
      return obj.command || JSON.stringify(content)
    }
  } catch (e) {
    // 解析失败则返回原内容
  }
  return typeof content === 'string' ? content : JSON.stringify(content)
}

/**
 * 生成唯一消息ID
 * @returns 唯一ID字符串
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
