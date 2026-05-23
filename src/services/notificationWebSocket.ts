import { ref } from 'vue'
import { getEnvConfig } from '../config'
import { isNativeApp } from '../utils/platform'

export interface NotificationRelationshipData {
  favorability: number
  levelName: string
  level: string
  totalInteractions: number
  lastInteractionTime: string | null
}

export interface FavorabilityChangeData {
  favorability: number
  delta: number
  levelName: string
  levelUp: boolean
}

export interface ProactiveNotificationMessage {
  type: 'TEXT' | 'CONTROL'
  subType?: 'diary' | 'life_event' | 'miss_you' | 'auto_chat'
  content: string
  sender: string
  isProactive: boolean
  animation?: { emotion: string }
}

type NotificationHandler = (msg: ProactiveNotificationMessage) => void

class NotificationWebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private handlers: Set<NotificationHandler> = new Set()
  private _token: string = ''
  private _isManualClose = false
  private connectedHandlers: Set<() => void> = new Set()

  readonly relationship = ref<NotificationRelationshipData | null>(null)
  readonly isConnected = ref(false)

  connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this._token = token
    this._isManualClose = false

    const config = getEnvConfig()
    const protocol = config.wsBaseUrl.startsWith('wss') ? 'wss:' : 'ws:'
    let host: string
    if (isNativeApp()) {
      host = config.wsBaseUrl.replace(/^wss?:\/\//, '')
    } else if (config.env === 'development') {
      host = `${window.location.host}`
    } else {
      host = config.wsBaseUrl.replace(/^wss?:\/\//, '')
    }
    const url = `${protocol}//${host}/ws/notification?token=${encodeURIComponent(token)}`

    console.log('[NotificationWS] 连接中...', url.replace(/token=[^&]*/, 'token=***'))

    try {
      this.ws = new WebSocket(url)
    } catch (e) {
      console.error('[NotificationWS] 创建连接失败:', e)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      console.log('[NotificationWS] 已连接')
      this.isConnected.value = true
      this.startHeartbeat()
      this.notifyConnected()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        this.handleMessage(msg)
      } catch (e) {
        console.warn('[NotificationWS] 解析消息失败:', e)
      }
    }

    this.ws.onclose = (event) => {
      console.log('[NotificationWS] 连接关闭', event.code, event.reason)
      this.isConnected.value = false
      this.stopHeartbeat()

      if (!this._isManualClose) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      console.error('[NotificationWS] 连接错误')
      this.ws?.close()
    }
  }

  disconnect(): void {
    this._isManualClose = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, '用户断开')
      this.ws = null
    }
    this.isConnected.value = false
  }

  onMessage(handler: NotificationHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  onConnected(handler: () => void): () => void {
    this.connectedHandlers.add(handler)
    return () => this.connectedHandlers.delete(handler)
  }

  private handleMessage(msg: any): void {
    if (msg.type === 'CONTROL') {
      this.handleControlMessage(msg)
    }

    if (msg.type === 'TEXT' && msg.isProactive === true) {
      const proactiveMsg: ProactiveNotificationMessage = {
        type: msg.type,
        subType: msg.subType,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        sender: msg.sender || 'ai',
        isProactive: true,
        animation: msg.animation || undefined,
      }
      this.notifyHandlers(proactiveMsg)
    }
  }

  private handleControlMessage(msg: any): void {
    if (!msg.content || typeof msg.content !== 'string') return

    if (msg.content.startsWith('relationship_init:')) {
      try {
        const data = JSON.parse(msg.content.substring('relationship_init:'.length))
        console.log('[NotificationWS] 收到好感度初始数据:', data)
        this.relationship.value = {
          favorability: data.favorability ?? 0,
          levelName: data.levelName ?? '陌生',
          level: data.level ?? 'stranger',
          totalInteractions: data.totalInteractions ?? 0,
          lastInteractionTime: data.lastInteractionTime ?? null,
        }
      } catch (e) {
        console.error('[NotificationWS] 解析 relationship_init 失败:', e)
      }
    } else if (msg.content.startsWith('favorability_changed:')) {
      try {
        const data: FavorabilityChangeData = JSON.parse(
          msg.content.substring('favorability_changed:'.length)
        )
        console.log('[NotificationWS] 好感度变化:', data)

        if (this.relationship.value) {
          this.relationship.value = {
            ...this.relationship.value,
            favorability: data.favorability,
            levelName: data.levelName,
          }
        }
      } catch (e) {
        console.error('[NotificationWS] 解析 favorability_changed 失败:', e)
      }
    }
  }

  private notifyHandlers(msg: ProactiveNotificationMessage): void {
    this.handlers.forEach(h => {
      try {
        h(msg)
      } catch (e) {
        console.error('[NotificationWS] handler 执行失败:', e)
      }
    })
  }

  private notifyConnected(): void {
    this.connectedHandlers.forEach(h => {
      try {
        h()
      } catch (e) {
        console.error('[NotificationWS] connectedHandler 执行失败:', e)
      }
    })
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('PING')
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this._token && !this._isManualClose) {
        this.connect(this._token)
      }
    }, 3000)
  }
}

export const notificationWs = new NotificationWebSocketService()
