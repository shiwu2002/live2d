/**
 * 浏览器通知服务
 * 用于处理主动推送消息的浏览器通知
 */

// 通知权限状态
export type NotificationPermission = 'default' | 'granted' | 'denied'

/**
 * 浏览器通知服务类
 */
export class NotificationService {
  private static instance: NotificationService | null = null
  private permission: NotificationPermission = 'default'

  private constructor() {
    this.checkPermission()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * 检查通知权限
   */
  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission as NotificationPermission
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持通知')
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission as NotificationPermission
      return this.permission
    } catch (error) {
      console.error('请求通知权限失败:', error)
      return 'denied'
    }
  }

  /**
   * 是否有通知权限
   */
  hasPermission(): boolean {
    return this.permission === 'granted'
  }

  /**
   * 发送通知
   * @param title 通知标题
   * @param body 通知内容
   * @param options 额外选项
   */
  async sendNotification(
    title: string,
    body: string,
    options?: NotificationOptions & { onClick?: () => void }
  ): Promise<void> {
    // 如果没有权限，先请求
    if (this.permission !== 'granted') {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.log('用户拒绝了通知权限')
        return
      }
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/vite.svg', // 使用项目图标
        badge: '/vite.svg',
        tag: `live2d-notification-${Date.now()}`, // 唯一标识，避免重复
        requireInteraction: false, // 不需要用户交互即可关闭
        ...options
      })

      // 点击通知事件
      if (options?.onClick) {
        notification.onclick = () => {
          window.focus()
          options.onClick!()
          notification.close()
        }
      } else {
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      }

      // 自动关闭（5秒后）
      setTimeout(() => {
        notification.close()
      }, 5000)

    } catch (error) {
      console.error('发送通知失败:', error)
    }
  }

  /**
   * 发送 AI 主动消息通知
   */
  sendProactiveMessageNotification(content: string, characterName?: string): void {
    const title = characterName ? `${characterName}找你啦` : '🔔 收到新消息'
    
    this.sendNotification(title, content, {
      onClick: () => {
        // 点击后可以滚动到聊天窗口或执行其他操作
        console.log('用户点击了主动消息通知')
      }
    })
  }

  /**
   * 发送日记通知
   */
  sendDiaryNotification(characterName?: string): void {
    const title = characterName ? `${characterName}写了新日记` : '📖 新日记'
    const body = '点击查看最新的日记内容'

    this.sendNotification(title, body, {
      onClick: () => {
        // 点击后打开日记面板
        console.log('用户点击了日记通知')
      }
    })
  }
}

// 导出单例实例
export const notificationService = NotificationService.getInstance()
