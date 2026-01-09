/**
 * 聊天相关的类型定义
 * 统一管理所有聊天消息相关的类型
 */
import type { 
  ChatMessage, 
  MessageType,
  AudioMessage as BaseAudioMessage,
  TextMessage,
  ImageMessage,
  ControlMessage,
  ErrorMessage
} from '../services/websocket'

// 重新导出基础类型，方便其他模块使用
export type { 
  MessageType,
  TextMessage,
  ImageMessage,
  ControlMessage,
  ErrorMessage,
  ChatMessage
}

/**
 * 扩展的聊天消息类型
 * 添加了duration字段以支持音频时长显示
 */
export type ExtendedChatMessage = ChatMessage & {
  duration?: number // 音频时长（毫秒）
}

/**
 * 可在UI中显示的消息类型
 * 排除了系统级别的CONTROL、ERROR、PING、PONG消息
 */
export type DisplayableMessageType = 'TEXT' | 'IMAGES' | 'AUDIO'

/**
 * 可显示的消息类型（使用Extract工具类型）
 */
export type DisplayableMessage = Extract<ChatMessage, { type: DisplayableMessageType }>
