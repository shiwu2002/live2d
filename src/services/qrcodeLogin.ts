/**
 * 二维码登录服务
 * 负责生成二维码、监听扫码状态、处理登录逻辑
 */

import QRCode from 'qrcode'
import type {
  QRCodeInfo,
  UserLoginInfo,
  WSMessage
} from '../types/login'
import {
  QRCodeLoginStatus,
  WSMessageType
} from '../types/login'

// 二维码配置
const QR_CONFIG = {
  EXPIRE_TIME: 5 * 60 * 1000,  // 二维码有效期：5分钟
  POLL_INTERVAL: 2000,          // 轮询间隔：2秒
  WIDTH: 280,                   // 二维码宽度
  MARGIN: 2,                    // 二维码边距
  COLOR_DARK: '#000000',        // 二维码前景色
  COLOR_LIGHT: '#ffffff'        // 二维码背景色
}

export class QRCodeLoginService {
  private ws: WebSocket | null = null
  private currentQRCode: QRCodeInfo | null = null
  private pollingTimer: number | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  // 事件回调
  private onStatusChange?: (status: QRCodeLoginStatus, qrcode?: QRCodeInfo) => void
  private onLoginSuccess?: (userInfo: UserLoginInfo) => void
  private onLoginFailed?: (error: string) => void
  private onWSConnected?: () => void
  private onWSDisconnected?: () => void

  private wsUrl: string

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl
  }

  /**
   * 初始化WebSocket连接
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl)

        this.ws.onopen = () => {
          console.log('二维码登录WebSocket已连接')
          this.reconnectAttempts = 0
          this.onWSConnected?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleWSMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket连接已关闭')
          this.onWSDisconnected?.()
          this.attemptReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    
    console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连...`)
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(err => {
        console.error('重连失败:', err)
      })
    }, delay)
  }

  /**
   * 处理WebSocket消息
   */
  private handleWSMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data)
      
      switch (message.type) {
        case WSMessageType.QR_SCAN:
          // 用户已扫码
          if (this.currentQRCode) {
            this.currentQRCode.status = QRCodeLoginStatus.SCANNED
            this.onStatusChange?.(QRCodeLoginStatus.SCANNED, this.currentQRCode)
          }
          break

        case WSMessageType.LOGIN_SUCCESS:
          // 登录成功
          if (message.userInfo) {
            this.stopPolling()
            if (this.currentQRCode) {
              this.currentQRCode.status = QRCodeLoginStatus.CONFIRMED
            }
            this.onStatusChange?.(QRCodeLoginStatus.CONFIRMED, this.currentQRCode || undefined)
            this.onLoginSuccess?.(message.userInfo)
          }
          break

        case WSMessageType.QR_CANCEL:
          // 用户取消登录
          if (this.currentQRCode) {
            this.currentQRCode.status = QRCodeLoginStatus.CANCELED
            this.onStatusChange?.(QRCodeLoginStatus.CANCELED, this.currentQRCode)
          }
          break

        case WSMessageType.QR_EXPIRE:
          // 二维码过期
          if (this.currentQRCode) {
            this.currentQRCode.status = QRCodeLoginStatus.EXPIRED
            this.onStatusChange?.(QRCodeLoginStatus.EXPIRED, this.currentQRCode)
          }
          break

        case WSMessageType.LOGIN_FAILED:
          // 登录失败
          this.stopPolling()
          this.onLoginFailed?.(message.data?.error || '登录失败')
          break

        default:
          console.log('收到未知消息类型:', message.type)
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
    }
  }

  /**
   * 生成二维码
   */
  async generateQRCode(): Promise<QRCodeInfo> {
    // 生成唯一的二维码ID
    const qrcodeId = this.generateQRCodeId()
    const now = Date.now()
    const expireTime = now + QR_CONFIG.EXPIRE_TIME

    // 构造小程序扫码数据
    // 格式：应用标识|二维码ID|过期时间
    const qrData = `wxlogin|${qrcodeId}|${expireTime}`

    try {
      // 生成二维码图片（Base64格式）
      const qrcodeUrl = await QRCode.toDataURL(qrData, {
        width: QR_CONFIG.WIDTH,
        margin: QR_CONFIG.MARGIN,
        color: {
          dark: QR_CONFIG.COLOR_DARK,
          light: QR_CONFIG.COLOR_LIGHT
        }
      })

      this.currentQRCode = {
        qrcodeId,
        qrcodeUrl,
        status: QRCodeLoginStatus.PENDING,
        expireTime,
        createTime: now
      }

      // 通知服务器创建二维码会话
      this.sendWSMessage({
        type: WSMessageType.QR_CREATE,
        qrcodeId,
        timestamp: now
      })

      // 开始轮询检查状态
      this.startPolling()

      // 设置过期定时器
      setTimeout(() => {
        if (this.currentQRCode?.status === QRCodeLoginStatus.PENDING) {
          this.currentQRCode.status = QRCodeLoginStatus.EXPIRED
          this.onStatusChange?.(QRCodeLoginStatus.EXPIRED, this.currentQRCode)
          this.stopPolling()
        }
      }, QR_CONFIG.EXPIRE_TIME)

      this.onStatusChange?.(QRCodeLoginStatus.PENDING, this.currentQRCode)

      return this.currentQRCode
    } catch (error) {
      console.error('生成二维码失败:', error)
      throw new Error('生成二维码失败')
    }
  }

  /**
   * 生成二维码唯一标识
   */
  private generateQRCodeId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 发送WebSocket消息
   */
  private sendWSMessage(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，无法发送消息')
    }
  }

  /**
   * 开始轮询检查状态
   */
  private startPolling(): void {
    this.stopPolling()
    this.pollingTimer = window.setInterval(() => {
      this.checkQRCodeStatus()
    }, QR_CONFIG.POLL_INTERVAL)
  }

  /**
   * 停止轮询
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * 检查二维码状态（轮询）
   */
  private checkQRCodeStatus(): void {
    if (!this.currentQRCode) return

    const now = Date.now()
    
    // 检查是否过期
    if (now >= this.currentQRCode.expireTime && 
        this.currentQRCode.status === QRCodeLoginStatus.PENDING) {
      this.currentQRCode.status = QRCodeLoginStatus.EXPIRED
      this.onStatusChange?.(QRCodeLoginStatus.EXPIRED, this.currentQRCode)
      this.stopPolling()
    }
  }

  /**
   * 刷新二维码
   */
  async refreshQRCode(): Promise<QRCodeInfo> {
    this.stopPolling()
    return this.generateQRCode()
  }

  /**
   * 设置状态变化回调
   */
  setOnStatusChange(callback: (status: QRCodeLoginStatus, qrcode?: QRCodeInfo) => void): void {
    this.onStatusChange = callback
  }

  /**
   * 设置登录成功回调
   */
  setOnLoginSuccess(callback: (userInfo: UserLoginInfo) => void): void {
    this.onLoginSuccess = callback
  }

  /**
   * 设置登录失败回调
   */
  setOnLoginFailed(callback: (error: string) => void): void {
    this.onLoginFailed = callback
  }

  /**
   * 设置WebSocket连接回调
   */
  setOnWSConnected(callback: () => void): void {
    this.onWSConnected = callback
  }

  /**
   * 设置WebSocket断开回调
   */
  setOnWSDisconnected(callback: () => void): void {
    this.onWSDisconnected = callback
  }

  /**
   * 获取当前二维码信息
   */
  getCurrentQRCode(): QRCodeInfo | null {
    return this.currentQRCode
  }

  /**
   * 断开连接并清理资源
   */
  disconnect(): void {
    this.stopPolling()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.currentQRCode = null
  }
}

/**
 * 创建二维码登录服务实例
 */
export function createQRCodeLoginService(wsUrl: string): QRCodeLoginService {
  return new QRCodeLoginService(wsUrl)
}
