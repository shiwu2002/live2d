/**
 * WebSocket 服务
 * 适配后端协议：支持文本聊天和语音通话两种模式
 */

// 消息类型（后端协议使用大写）
export type MessageType = 'TEXT' | 'AUDIO' | 'CONTROL' | 'ERROR' | 'PING' | 'PONG' | 'IMAGES'

// 控制命令类型
export type ControlCommand = 
  | 'open_websocket'
  | 'close_websocket'
  | 'voice_call_request'
  | 'voice_call_accept'
  | 'voice_call_reject'
  | 'voice_call_end'
  | 'start_recording'
  | 'stop_recording'
  | 'start_recognition'
  | 'interrupt'

// 基础消息接口
export interface BaseMessage {
  type: MessageType
  content: any
  sender?: 'user' | 'system' | 'ai'
  timestamp?: number
  id?: string
}

// 文本消息
export interface TextMessage extends BaseMessage {
  type: 'TEXT'
  content: string
}

// 音频消息
export interface AudioMessage extends BaseMessage {
  type: 'AUDIO'
  content: ArrayBuffer | string // PCM数据或base64
}

// 控制消息
export interface ControlMessage extends BaseMessage {
  type: 'CONTROL'
  content: {
    command: ControlCommand
    data?: any
  }
}

// 错误消息
export interface ErrorMessage extends BaseMessage {
  type: 'ERROR'
  content: {
    code: string
    message: string
  }
}

// 图片消息
export interface ImageMessage extends BaseMessage {
  type: 'IMAGES'
  content: string[] | { urls: string[] }
}

export type ChatMessage = TextMessage | AudioMessage | ControlMessage | ErrorMessage | ImageMessage

// 回调类型
export type MessageCallback = (message: ChatMessage) => void
export type ConnectionCallback = (connected: boolean) => void
export type ErrorCallback = (error: Error) => void

// WebSocket 配置
export interface WebSocketConfig {
  baseUrl: string
  openid?: string
  aiSessionId?: string
  mode: 'text' | 'voice' // 文本聊天或语音通话
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private messageCallbacks: Set<MessageCallback> = new Set()
  private connectionCallbacks: Set<ConnectionCallback> = new Set()
  private errorCallbacks: Set<ErrorCallback> = new Set()
  private heartbeatInterval: number | null = null
  private isManualClose = false

  constructor(config: WebSocketConfig) {
    this.config = config
  }

  /**
   * 获取完整的 WebSocket URL
   */
  private getWebSocketUrl(): string {
    const { baseUrl, openid, aiSessionId, mode } = this.config
    
    // 根据模式选择端点
    const endpoint = mode === 'voice' ? '/ws/voice' : '/ws/chat'
    
    // 检查baseUrl是否已经包含端点路径，避免重复
    let url = baseUrl.endsWith(endpoint) ? baseUrl : `${baseUrl}${endpoint}`
    
    // 添加认证参数
    const params = new URLSearchParams()
    if (openid) {
      params.append('openid', openid)
    }
    if (aiSessionId) {
      params.append('aiSessionId', aiSessionId)
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`
    }
    
    return url
  }

  /**
   * 连接 WebSocket 服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualClose = false
        const url = this.getWebSocketUrl()
        console.log(`连接 WebSocket: ${url}`)
        
        this.ws = new WebSocket(url)
        
        // 语音模式需要设置二进制类型
        if (this.config.mode === 'voice') {
          this.ws.binaryType = 'arraybuffer'
        }

        this.ws.onopen = () => {
          console.log('WebSocket 连接成功')
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.notifyConnection(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error)
          const err = new Error('WebSocket 连接错误')
          this.notifyError(err)
          reject(err)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket 连接关闭', event.code, event.reason)
          this.stopHeartbeat()
          this.notifyConnection(false)

          if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect()
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('连接失败')
        this.notifyError(err)
        reject(err)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualClose = true
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 重新连接
   */
  private reconnect(): void {
    this.reconnectAttempts++
    console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('重新连接失败:', error)
      })
    }, this.reconnectDelay)
  }

  /**
   * 处理接收到的消息
   */
  private async handleMessage(data: string | ArrayBuffer): Promise<void> {
    try {
      if (data instanceof ArrayBuffer) {
        // 二进制数据（语音模式的音频数据）
        const message: AudioMessage = {
          type: 'AUDIO',
          content: data,
          sender: 'ai',
          timestamp: Date.now(),
          id: this.generateId()
        }
        this.notifyMessage(message)
      } else if (typeof data === 'string') {
        // 尝试解析 JSON
        try {
          const parsed = JSON.parse(data)
          
          // 心跳响应
          if (parsed.type === 'PONG') {
            return
          }
          
          // 标准化消息格式
          const message: ChatMessage = {
            type: parsed.type,
            content: parsed.content,
            sender: parsed.sender || 'ai',
            timestamp: parsed.timestamp || Date.now(),
            id: parsed.id || this.generateId()
          }
          
          this.notifyMessage(message)
        } catch (e) {
          // 如果不是 JSON，当作纯文本消息处理
          const message: TextMessage = {
            type: 'TEXT',
            content: data,
            sender: 'ai',
            timestamp: Date.now(),
            id: this.generateId()
          }
          this.notifyMessage(message)
        }
      }
    } catch (error) {
      console.error('处理消息失败:', error)
      this.notifyError(error instanceof Error ? error : new Error('消息处理失败'))
    }
  }

  /**
   * 发送文本消息（支持纯文本或结构化消息）
   */
  sendText(content: string, asPlainText = false): boolean {
    if (!this.isConnected()) {
      console.error('WebSocket 未连接')
      return false
    }

    try {
      if (asPlainText) {
        // 直接发送纯文本
        this.ws!.send(content)
      } else {
        // 发送结构化消息
        const message: TextMessage = {
          type: 'TEXT',
          content,
          sender: 'user',
          timestamp: Date.now(),
          id: this.generateId()
        }
        this.ws!.send(JSON.stringify(message))
        
        // 本地回显
        this.notifyMessage(message)
      }
      
      return true
    } catch (error) {
      console.error('发送文本消息失败:', error)
      this.notifyError(error instanceof Error ? error : new Error('发送失败'))
      return false
    }
  }

  /**
   * 发送音频数据（PCM格式）
   */
  sendAudio(audioData: ArrayBuffer): boolean {
    if (!this.isConnected()) {
      console.error('WebSocket 未连接')
      return false
    }

    try {
      // 直接发送二进制数据
      this.ws!.send(audioData)
      
      // 注意：语音模式下不需要本地回显音频数据
      // 只有后端返回的TTS音频才需要播放
      
      return true
    } catch (error) {
      console.error('发送音频数据失败:', error)
      this.notifyError(error instanceof Error ? error : new Error('发送音频失败'))
      return false
    }
  }

  /**
   * 发送控制消息
   */
  sendControl(command: ControlCommand): boolean {
    if (!this.isConnected()) {
      console.error('WebSocket 未连接')
      return false
    }

    try {
      // 后端期望content为字符串格式，不是嵌套对象
      const message = {
        type: 'CONTROL',
        content: command,  // 直接使用command字符串作为content
        sender: 'user'
      }
      
      this.ws!.send(JSON.stringify(message))
      
      return true
    } catch (error) {
      console.error('发送控制消息失败:', error)
      this.notifyError(error instanceof Error ? error : new Error('发送控制消息失败'))
      return false
    }
  }

  /**
   * 发送图片消息
   */
  sendImages(imageUrls: string[]): boolean {
    if (!this.isConnected()) {
      console.error('WebSocket 未连接')
      return false
    }

    try {
      const message: ImageMessage = {
        type: 'IMAGES',
        content: imageUrls,
        sender: 'user',
        timestamp: Date.now(),
        id: this.generateId()
      }
      
      this.ws!.send(JSON.stringify(message))
      
      // 本地回显
      this.notifyMessage(message)
      
      return true
    } catch (error) {
      console.error('发送图片消息失败:', error)
      this.notifyError(error instanceof Error ? error : new Error('发送图片失败'))
      return false
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.ws!.send(JSON.stringify({ type: 'PING' }))
      }
    }, 30000) // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 通知消息回调
   */
  private notifyMessage(message: ChatMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('消息回调执行失败:', error)
      }
    })
  }

  /**
   * 通知连接状态回调
   */
  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected)
      } catch (error) {
        console.error('连接状态回调执行失败:', error)
      }
    })
  }

  /**
   * 通知错误回调
   */
  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        console.error('错误回调执行失败:', err)
      }
    })
  }

  /**
   * 订阅消息
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback)
    return () => this.messageCallbacks.delete(callback)
  }

  /**
   * 订阅连接状态
   */
  onConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback)
    return () => this.connectionCallbacks.delete(callback)
  }

  /**
   * 订阅错误
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback)
    return () => this.errorCallbacks.delete(callback)
  }
}
