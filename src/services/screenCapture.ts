import html2canvas from 'html2canvas'
import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'

export class ScreenCaptureService {
  private timer: ReturnType<typeof setInterval> | null = null
  private enabled = false
  private baseUrl: string

  private focusListenerAttached = false
  private lastCaptureTime = 0
  private readonly MIN_CAPTURE_INTERVAL = 2000

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl()
  }

  start(intervalMs: number = 10000): void {
    if (this.timer) {
      console.log('[ScreenCapture] 定时器已在运行')
      return
    }

    this.enabled = true
    console.log('[ScreenCapture] 启动屏幕截图服务，间隔:', intervalMs, 'ms')

    this.captureAndUpload()
    this.timer = setInterval(() => this.captureAndUpload(), intervalMs)
    this.attachFocusListener()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      console.log('[ScreenCapture] 已停止屏幕截图服务')
    }
    this.enabled = false
    this.detachFocusListener()
  }

  isRunning(): boolean {
    return this.timer !== null && this.enabled
  }

  captureImmediately(): void {
    if (!this.enabled) {
      console.log('[ScreenCapture] 服务未启用，跳过即时截图')
      return
    }

    const now = Date.now()
    const timeSinceLastCapture = now - this.lastCaptureTime

    if (timeSinceLastCapture < this.MIN_CAPTURE_INTERVAL) {
      console.log(`[ScreenCapture] 距离上次截图仅 ${timeSinceLastCapture}ms，跳过本次即时截图`)
      return
    }

    console.log('[ScreenCapture] 🎯 触发即时截图（检测到环境变化）')
    this.captureAndUpload()
  }

  private async captureAndUpload(): Promise<void> {
    if (!this.enabled) return

    try {
      const blob = await this.captureScreen()
      if (!blob) return

      this.lastCaptureTime = Date.now()

      const result = await this.uploadScreenshot(blob)

      if (result.code === 200) {
        console.log('[ScreenCapture] ✅ 环境识别成功:', result.data)
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

  private async uploadScreenshot(blob: Blob): Promise<{ code: number; msg?: string; data?: string | null }> {
    const formData = new FormData()
    formData.append('file', blob, 'screenshot.jpg')

    const response = await fetchWithAuth(`${this.baseUrl}/api/screen-capture/upload`, {
      method: 'POST',
      body: formData,
    })

    return response.json()
  }

  private attachFocusListener(): void {
    if (this.focusListenerAttached) {
      return
    }

    const handleWindowFocus = () => {
      console.log('[ScreenCapture] 🔄 检测到窗口获得焦点')
      setTimeout(() => {
        this.captureImmediately()
      }, 300)
    }

    window.addEventListener('focus', handleWindowFocus)
    this.focusListenerAttached = true
    console.log('[ScreenCapture] ✓ 已绑定窗口焦点事件监听')
  }

  private detachFocusListener(): void {
    this.focusListenerAttached = false
    console.log('[ScreenCapture] ✗ 已移除窗口焦点事件监听')
  }

  onEnvironmentUpdate?: (environmentDescription: string) => void
}

export const screenCaptureService = new ScreenCaptureService()
