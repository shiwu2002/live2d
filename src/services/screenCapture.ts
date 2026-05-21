/**
 * 屏幕环境感知服务
 * 定时截取屏幕截图并上传至后端，使 AI 能感知用户当前屏幕环境
 * 支持多种触发模式：
 * 1. 定时器轮询（默认每10秒）
 * 2. 窗口焦点切换时立即截图
 * 3. Electron 全局应用切换监听（用户切到其他应用时立即截图）
 */

import html2canvas from 'html2canvas'
import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'

export class ScreenCaptureService {
  private timer: ReturnType<typeof setInterval> | null = null
  private enabled = false
  private baseUrl: string

  // 窗口焦点监听相关
  private focusListenerAttached = false
  private lastCaptureTime = 0
  private readonly MIN_CAPTURE_INTERVAL = 2000 // 最小截图间隔 2 秒，防止频繁触发

  // Electron 全局应用切换监听相关
  private appSwitchListenerAttached = false
  private isElectronEnv = false

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl()
    
    // 检测是否在 Electron 环境中
    this.isElectronEnv = !!(window as any).electronAPI?.isElectron
    if (this.isElectronEnv) {
      console.log('[ScreenCapture] ✓ 检测到 Electron 环境，将启用全局应用切换监听')
    }
  }

  /**
   * 启动定时截屏
   * @param intervalMs 截图间隔（毫秒），默认 10000（10秒）
   */
  start(intervalMs: number = 10000): void {
    if (this.timer) {
      console.log('[ScreenCapture] 定时器已在运行')
      return
    }

    this.enabled = true
    console.log('[ScreenCapture] 启动屏幕截图服务，间隔:', intervalMs, 'ms')

    // 首次立即截图
    this.captureAndUpload()
    
    // 设置定时截图
    this.timer = setInterval(() => this.captureAndUpload(), intervalMs)

    // 绑定窗口焦点事件（用于检测应用切换）
    this.attachFocusListener()

    // 如果是 Electron 环境，启动全局应用切换监听
    if (this.isElectronEnv) {
      this.attachAppSwitchListener()
    }
  }

  /**
   * 停止定时截屏
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      console.log('[ScreenCapture] 已停止屏幕截图服务')
    }
    this.enabled = false
    
    // 移除窗口焦点事件监听
    this.detachFocusListener()

    // 如果是 Electron 环境，停止全局应用切换监听
    if (this.isElectronEnv) {
      this.detachAppSwitchListener()
    }
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.timer !== null && this.enabled
  }

  /**
   * 立即执行一次截图（用于外部调用，如窗口获得焦点时）
   * 包含防抖机制，避免短时间内多次触发
   */
  captureImmediately(): void {
    if (!this.enabled) {
      console.log('[ScreenCapture] 服务未启用，跳过即时截图')
      return
    }

    const now = Date.now()
    const timeSinceLastCapture = now - this.lastCaptureTime

    // 如果距离上次截图时间太短，则跳过（防止频繁触发）
    if (timeSinceLastCapture < this.MIN_CAPTURE_INTERVAL) {
      console.log(`[ScreenCapture] 距离上次截图仅 ${timeSinceLastCapture}ms，跳过本次即时截图`)
      return
    }

    console.log('[ScreenCapture] 🎯 触发即时截图（检测到环境变化）')
    this.captureAndUpload()
  }

  /**
   * 截图并上传（内部方法）
   */
  private async captureAndUpload(): Promise<void> {
    if (!this.enabled) return

    try {
      const blob = await this.captureScreen()
      if (!blob) return

      // 更新最后截图时间
      this.lastCaptureTime = Date.now()

      const result = await this.uploadScreenshot(blob)

      if (result.code === 200) {
        console.log('[ScreenCapture] ✅ 环境识别成功:', result.data)
        // 可以在这里发布事件或回调，通知其他组件环境已更新
        this.onEnvironmentUpdate?.(result.data || '')
      } else if (result.msg?.includes('未配置视觉模型')) {
        console.log('[ScreenCapture] ⚠️ 用户未配置视觉模型，停止截屏')
        this.enabled = false
        this.stop()
      } else {
        console.warn('[ScreenCapture] ⚠️ 上传返回异常:', result.msg)
      }
    } catch (error) {
      console.error('[ScreenCapture] ❌ 截图上传失败:', error)
    }
  }

  /**
   * 使用 html2canvas 截取页面截图
   */
  private async captureScreen(): Promise<Blob | null> {
    try {
      const canvas = await html2canvas(document.body, {
        scale: 0.5,
        useCORS: true,
        logging: false,
        imageTimeout: 5000,
        allowTaint: true,
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.6)
      })

      return blob
    } catch (error) {
      console.error('[ScreenCapture] 截屏失败:', error)
      return null
    }
  }

  /**
   * 上传截图到后端
   */
  private async uploadScreenshot(blob: Blob): Promise<{ code: number; msg?: string; data?: string | null }> {
    const formData = new FormData()
    formData.append('file', blob, 'screenshot.jpg')

    const response = await fetchWithAuth(`${this.baseUrl}/api/screen-capture/upload`, {
      method: 'POST',
      body: formData,
    })

    return response.json()
  }

  // ==================== 窗口焦点事件监听 ====================

  /**
   * 绑定窗口焦点事件监听
   * 当用户从其他应用切回本应用时，立即触发截图以捕获新环境
   */
  private attachFocusListener(): void {
    if (this.focusListenerAttached) {
      return
    }

    const handleWindowFocus = () => {
      console.log('[ScreenCapture] 🔄 检测到窗口获得焦点（用户切换回本应用）')
      
      // 延迟一小段时间再截图，确保页面已完全渲染
      setTimeout(() => {
        this.captureImmediately()
      }, 300) // 300ms 延迟，让浏览器完成渲染
    }

    const handleWindowBlur = () => {
      console.log('[ScreenCapture] 👋 检测到窗口失去焦点（用户切换到其他应用）')
    }

    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)

    this.focusListenerAttached = true
    console.log('[ScreenCapture] ✓ 已绑定窗口焦点事件监听')
  }

  /**
   * 移除窗口焦点事件监听
   */
  private detachFocusListener(): void {
    // 由于使用了匿名函数，这里简单移除所有 focus/blur 监听
    // 在实际生产中可以使用具名函数引用来精确移除
    this.focusListenerAttached = false
    console.log('[ScreenCapture] ✗ 已移除窗口焦点事件监听')
  }

  // ==================== Electron 全局应用切换监听 ====================

  /**
   * 绑定 Electron 全局应用切换监听
   * 仅在 Electron 环境下生效
   * 当用户从本应用切换到其他应用时，立即截图捕获当前屏幕内容
   */
  private attachAppSwitchListener(): void {
    if (this.appSwitchListenerAttached || !this.isElectronEnv) {
      return
    }

    const electronAPI = (window as any).electronAPI

    // 监听用户切换到其他应用的事件
    electronAPI.onAppSwitchedToOther(() => {
      console.log('[ScreenCapture] 🚨 [Electron] 检测到用户切换到其他应用！立即截屏...')
      
      // 用户刚切换走，此时我们的页面还是可见的，可以立即截图
      setTimeout(() => {
        this.captureImmediately()
      }, 100) // 短暂延迟确保系统完成窗口切换
    })

    // 监听用户切回本应用的事件
    electronAPI.onAppSwitchedBack(() => {
      console.log('[ScreenCapture] 🏠 [Electron] 用户切回了本应用')
      
      // 用户切回来后也可以截图一次（可选）
      setTimeout(() => {
        this.captureImmediately()
      }, 300)
    })

    // 启动主进程的全局监听
    electronAPI.startAppSwitchMonitor()

    this.appSwitchListenerAttached = true
    console.log('[ScreenCapture] ✓ [Electron] 已启用全局应用切换监听（后台模式）')
  }

  /**
   * 移除 Electron 全局应用切换监听
   */
  private detachAppSwitchListener(): void {
    if (!this.appSwitchListenerAttached || !this.isElectronEnv) {
      return
    }

    try {
      const electronAPI = (window as any).electronAPI
      
      // 停止主进程的全局监听
      electronAPI.stopAppSwitchMonitor()
      
      this.appSwitchListenerAttached = false
      console.log('[ScreenCapture] ✗ [Electron] 已禁用全局应用切换监听')
    } catch (error) {
      console.error('[ScreenCapture] 停止应用切换监听失败:', error)
    }
  }

  /**
   * 环境更新回调（可选，供外部订阅使用）
   */
  onEnvironmentUpdate?: (environmentDescription: string) => void
}

// 导出单例
export const screenCaptureService = new ScreenCaptureService()
