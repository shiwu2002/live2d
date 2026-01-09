/**
 * 聊天相关配置
 */

// WebSocket 配置接口
export interface ChatConfig {
  // WebSocket 服务器地址
  baseUrl: string
  // 用户唯一标识
  openid: string
  // AI 会话 ID
  aiSessionId: string
  // 聊天模式：文本或语音
  mode: 'text' | 'voice'
  // 是否启用自动重连
  autoReconnect: boolean
  // 重连间隔（毫秒）
  reconnectInterval: number
  // 最大重连次数
  maxReconnectAttempts: number
  // 心跳间隔（毫秒）
  heartbeatInterval: number
}

// 默认配置
export const defaultChatConfig: ChatConfig = {
  // WebSocket 服务器地址（生产环境需要修改为实际地址）
  baseUrl: 'ws://localhost:8080',
  
  // 用户唯一标识（实际使用时应从登录系统获取）
  openid: 'test_user_001',
  
  // AI 会话 ID（使用时间戳生成，实际可使用 UUID）
  aiSessionId: `session_${Date.now()}`,
  
  // 默认聊天模式
  mode: 'text',
  
  // 自动重连配置
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  
  // 心跳配置
  heartbeatInterval: 30000
}

// 音频配置
export interface AudioConfig {
  // 采样率（Hz）
  sampleRate: number
  // 位深度（bit）
  bitDepth: 16
  // 声道数
  channels: 1
  // 字节序
  endianness: 'little' | 'big'
}

// 默认音频配置（符合后端 PCM 格式要求）
export const defaultAudioConfig: AudioConfig = {
  sampleRate: 16000,
  bitDepth: 16,
  channels: 1,
  endianness: 'little'
}

/**
 * 获取聊天配置
 * @param overrides 覆盖的配置项
 * @returns 合并后的配置
 */
export function getChatConfig(overrides?: Partial<ChatConfig>): ChatConfig {
  return {
    ...defaultChatConfig,
    ...overrides
  }
}

/**
 * 生成新的会话 ID
 * @returns 会话 ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
