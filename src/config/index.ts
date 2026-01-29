/**
 * 统一配置文件
 * 管理所有服务的地址和配置
 */

// ==================== 类型定义 ====================

// 环境类型
export type Environment = 'development' | 'production'

// 环境配置接口
export interface EnvConfig {
  // 当前环境
  env: Environment
  
  // API 基础地址（HTTP/HTTPS）
  apiBaseUrl: string
  
  // WebSocket 基础地址
  wsBaseUrl: string
  
  // 具体服务的 WebSocket 路径
  wsEndpoints: {
    chat: string          // 聊天服务
    voice: string         // 语音通话服务
    qrcodeLogin: string   // 扫码登录服务
  }
}

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

// ==================== 环境配置 ====================

// 开发环境配置
const developmentConfig: EnvConfig = {
  env: 'development',
  apiBaseUrl: 'http://localhost:8088',
  wsBaseUrl: 'ws://localhost:8088',
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login'
  }
}

// 生产环境配置
const productionConfig: EnvConfig = {
  env: 'production',
  // 生产环境地址（部署时需要修改）
  apiBaseUrl: 'https://118.31.118.176',
  wsBaseUrl: 'wss://118.31.118.176',  // 使用 wss:// 协议，Nginx 会代理转换为 ws://
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login'
  }
}

// ==================== 默认配置 ====================

// 默认聊天配置
export const defaultChatConfig: ChatConfig = {
  // WebSocket 服务器地址（通过 getWebSocketUrl 动态获取）
  baseUrl: 'wss://118.31.118.176',  // 使用 wss:// 协议
  
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

// 默认音频配置（符合后端 PCM 格式要求）
export const defaultAudioConfig: AudioConfig = {
  sampleRate: 16000,
  bitDepth: 16,
  channels: 1,
  endianness: 'little'
}

// ==================== 工具函数 ====================

/**
 * 获取当前环境
 */
function getCurrentEnvironment(): Environment {
  // 优先使用环境变量
  const viteEnv = import.meta.env.MODE
  
  if (viteEnv === 'production') {
    return 'production'
  }
  
  return 'development'
}

/**
 * 获取当前环境配置
 */
export function getEnvConfig(): EnvConfig {
  const env = getCurrentEnvironment()
  
  if (env === 'production') {
    return productionConfig
  }
  
  return developmentConfig
}

/**
 * 获取完整的 WebSocket URL
 * @param endpoint WebSocket 端点类型
 * @returns 完整的 WebSocket URL
 */
export function getWebSocketUrl(endpoint: keyof EnvConfig['wsEndpoints']): string {
  const config = getEnvConfig()
  return `${config.wsBaseUrl}${config.wsEndpoints[endpoint]}`
}

/**
 * 获取 API 基础地址
 */
export function getApiBaseUrl(): string {
  const config = getEnvConfig()
  return config.apiBaseUrl
}

/**
 * 获取所有 WebSocket 端点 URL
 */
export function getAllWebSocketUrls() {
  return {
    chat: getWebSocketUrl('chat'),
    voice: getWebSocketUrl('voice'),
    qrcodeLogin: getWebSocketUrl('qrcodeLogin')
  }
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

/**
 * 日志输出环境配置
 */
export function logEnvConfig(): void {
  const config = getEnvConfig()
  console.log('========== 环境配置 ==========')
  console.log('当前环境:', config.env)
  console.log('API 基础地址:', config.apiBaseUrl)
  console.log('WebSocket 基础地址:', config.wsBaseUrl)
  console.log('WebSocket 端点:')
  console.log('  - 聊天服务:', getWebSocketUrl('chat'))
  console.log('  - 语音通话:', getWebSocketUrl('voice'))
  console.log('  - 扫码登录:', getWebSocketUrl('qrcodeLogin'))
  console.log('============================')
}

// 导出当前环境配置（只读）
export const currentEnvConfig = getEnvConfig()
