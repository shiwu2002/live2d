/**
 * 语音通话管理器（v2.0.0）
 * 整合WebSocket、音频录制和播放功能
 * 支持流式AI回复累积显示
 */

import { WebSocketService, type WebSocketConfig } from './websocket'
import { AudioRecorder } from './audioRecorder'
import { AudioPlayer } from './audioPlayer'

export type VoiceCallState = 'idle' | 'connecting' | 'connected' | 'talking' | 'listening' | 'error'

export interface VoiceCallManagerConfig {
  wsBaseUrl: string
  openid?: string
  aiSessionId?: string
  autoReconnect?: boolean
}

export class VoiceCallManager {
  private wsService: WebSocketService
  private audioRecorder: AudioRecorder
  private audioPlayer: AudioPlayer
  private state: VoiceCallState = 'idle'
  private stateCallbacks: Set<(state: VoiceCallState) => void> = new Set()
  private errorCallbacks: Set<(error: Error) => void> = new Set()
  private recognitionCallbacks: Set<(text: string) => void> = new Set()
  private aiReplyCallbacks: Set<(text: string, isFinal: boolean) => void> = new Set()
  
  // 流式AI回复累积缓冲区
  private aiReplyBuffer = ''

  constructor(config: VoiceCallManagerConfig) {

    // 初始化WebSocket服务（语音模式）
    const wsConfig: WebSocketConfig = {
      baseUrl: config.wsBaseUrl,
      openid: config.openid,
      aiSessionId: config.aiSessionId,
      mode: 'voice'
    }
    this.wsService = new WebSocketService(wsConfig)

    // 初始化音频录制器（16kHz, 16bit, 单声道）
    this.audioRecorder = new AudioRecorder({
      sampleRate: 16000,
      channelCount: 1,
      bitDepth: 16
    })

    // 初始化音频播放器（v2.0.0：无需指定采样率等参数）
    this.audioPlayer = new AudioPlayer()

    // 设置WebSocket消息监听
    this.setupWebSocketListeners()
  }

  /**
   * 设置WebSocket监听器
   */
  private setupWebSocketListeners(): void {
    // 监听消息
    this.wsService.onMessage((message) => {
      if (message.type === 'AUDIO') {
        // 接收到TTS音频数据（MP3格式），播放
        if (message.content instanceof ArrayBuffer) {
          this.handleReceivedAudio(message.content)
        }
      } else if (message.type === 'TEXT') {
        // 接收到文本消息
        if (typeof message.content === 'string') {
          this.handleTextMessage(message.content)
        }
      } else if (message.type === 'CONTROL') {
        // 接收到控制消息
        this.handleControlMessage(message.content)
      } else if (message.type === 'ERROR') {
        // 接收到错误消息
        const errorMsg = typeof message.content === 'string' 
          ? message.content 
          : message.content?.message || '未知错误'
        this.handleError(new Error(errorMsg))
      }
    })

    // 监听连接状态
    this.wsService.onConnection((connected) => {
      if (connected) {
        this.updateState('connected')
        // 发送开启WebSocket功能的控制命令
        this.wsService.sendControl('open_websocket')
      } else {
        this.updateState('idle')
      }
    })

    // 监听错误
    this.wsService.onError((error) => {
      this.handleError(error)
    })
  }

  /**
   * 处理文本消息（v2.0.0：支持流式AI回复）
   */
  private handleTextMessage(text: string): void {
    // 判断是否为AI回复（以"ai:"开头）
    if (text.startsWith('ai:')) {
      // 提取AI回复内容
      const aiContent = text.substring(3) // 去掉"ai:"前缀
      
      // 累积到缓冲区
      this.aiReplyBuffer += aiContent
      
      // 通知流式AI回复（非最终）
      this.notifyAiReply(this.aiReplyBuffer, false)
      
      console.log('收到流式AI回复:', aiContent)
    } else if (text === 'ai_reply_complete') {
      // AI回复完成标记
      console.log('AI回复完成，总内容:', this.aiReplyBuffer)
      
      // 通知AI回复完成（最终）
      this.notifyAiReply(this.aiReplyBuffer, true)
      
      // 清空缓冲区
      this.aiReplyBuffer = ''
    } else {
      // 其他文本消息（如识别结果）
      this.notifyRecognition(text)
    }
  }

  /**
   * 开始语音通话
   */
  async startCall(): Promise<void> {
    if (this.state !== 'idle') {
      console.warn('通话已在进行中或正在连接')
      return
    }

    try {
      this.updateState('connecting')

      // 连接WebSocket
      await this.wsService.connect()

      // 开始录音并发送音频数据
      await this.audioRecorder.start((audioData) => {
        if (this.wsService.isConnected()) {
          this.wsService.sendAudio(audioData)
        }
      })

      this.updateState('talking')
      console.log('语音通话已开始')
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error('启动通话失败'))
      throw error
    }
  }

  /**
   * 结束语音通话
   */
  endCall(): void {
    // 停止录音
    this.audioRecorder.stop()

    // 停止播放
    this.audioPlayer.stop()

    // 清空AI回复缓冲区
    this.aiReplyBuffer = ''

    // 发送关闭WebSocket功能的控制命令
    if (this.wsService.isConnected()) {
      this.wsService.sendControl('close_websocket')
    }

    // 断开WebSocket
    this.wsService.disconnect()

    this.updateState('idle')
    console.log('语音通话已结束')
  }

  /**
   * 暂停录音（保持连接）
   */
  pauseRecording(): void {
    this.audioRecorder.pause()
    this.updateState('listening')
  }

  /**
   * 恢复录音
   */
  resumeRecording(): void {
    this.audioRecorder.resume()
    this.updateState('talking')
  }

  /**
   * 打断当前对话
   */
  interrupt(): void {
    // 停止播放
    this.audioPlayer.stop()

    // 清空AI回复缓冲区
    this.aiReplyBuffer = ''

    // 发送打断命令
    if (this.wsService.isConnected()) {
      this.wsService.sendControl('interrupt')
    }

    // 恢复录音
    this.resumeRecording()
  }

  /**
   * 处理接收到的音频数据（v2.0.0：MP3格式）
   */
  private async handleReceivedAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      // 调试：检查接收到的数据
      console.log('收到音频数据，大小:', audioData.byteLength, 'bytes')
      
      // 验证数据有效性
      if (!audioData || audioData.byteLength === 0) {
        console.warn('收到空音频数据，跳过播放')
        return
      }
      
      // 检查是否为有效的MP3数据（MP3文件头通常以 0xFF 0xFB 或 0xFF 0xF3 开头）
      const view = new Uint8Array(audioData)
      if (view.length >= 2) {
        const firstByte = view[0] as number
        const secondByte = view[1] as number
        console.log('音频数据前两个字节:', 
          '0x' + firstByte.toString(16).padStart(2, '0').toUpperCase(),
          '0x' + secondByte.toString(16).padStart(2, '0').toUpperCase()
        )
      }
      
      // 播放TTS音频（MP3格式）
      await this.audioPlayer.play(audioData)
      
      // 播放AI回复时暂停录音
      if (this.state === 'talking') {
        this.pauseRecording()
      }
    } catch (error) {
      console.error('播放音频失败:', error)
    }
  }

  /**
   * 处理控制消息
   */
  private handleControlMessage(content: any): void {
    const command = typeof content === 'string' ? content : content?.command
    
    switch (command) {
      case 'connected':
        console.log('WebSocket已连接')
        break
      case 'start_recording':
        this.resumeRecording()
        break
      case 'stop_recording':
        this.pauseRecording()
        break
      default:
        console.log('收到控制消息:', command)
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    console.error('语音通话错误:', error)
    this.updateState('error')
    this.notifyError(error)
  }

  /**
   * 更新状态
   */
  private updateState(newState: VoiceCallState): void {
    if (this.state !== newState) {
      this.state = newState
      this.notifyStateChange(newState)
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(state: VoiceCallState): void {
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('状态回调执行失败:', error)
      }
    })
  }

  /**
   * 通知错误
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
   * 通知识别结果
   */
  private notifyRecognition(text: string): void {
    this.recognitionCallbacks.forEach(callback => {
      try {
        callback(text)
      } catch (error) {
        console.error('识别结果回调执行失败:', error)
      }
    })
  }

  /**
   * 通知AI回复（v2.0.0：支持流式回复）
   * @param text AI回复文本
   * @param isFinal 是否为最终完整回复
   */
  private notifyAiReply(text: string, isFinal: boolean): void {
    this.aiReplyCallbacks.forEach(callback => {
      try {
        callback(text, isFinal)
      } catch (error) {
        console.error('AI回复回调执行失败:', error)
      }
    })
  }

  /**
   * 订阅状态变化
   */
  onStateChange(callback: (state: VoiceCallState) => void): () => void {
    this.stateCallbacks.add(callback)
    return () => this.stateCallbacks.delete(callback)
  }

  /**
   * 订阅错误
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.add(callback)
    return () => this.errorCallbacks.delete(callback)
  }

  /**
   * 订阅识别结果
   */
  onRecognition(callback: (text: string) => void): () => void {
    this.recognitionCallbacks.add(callback)
    return () => this.recognitionCallbacks.delete(callback)
  }

  /**
   * 订阅AI回复（v2.0.0：支持流式回复）
   * @param callback 回调函数，参数：(text: 累积的AI回复文本, isFinal: 是否为最终完整回复)
   */
  onAiReply(callback: (text: string, isFinal: boolean) => void): () => void {
    this.aiReplyCallbacks.add(callback)
    return () => this.aiReplyCallbacks.delete(callback)
  }

  /**
   * 设置音量
   * 注意：新版AudioPlayer暂未实现音量控制，此方法为占位符
   */
  setVolume(_volume: number): void {
    console.warn('音量控制功能待实现')
  }

  /**
   * 获取音量
   * 注意：新版AudioPlayer暂未实现音量控制，此方法为占位符
   */
  getVolume(): number {
    return 1.0
  }

  /**
   * 获取当前状态
   */
  getState(): VoiceCallState {
    return this.state
  }

  /**
   * 检查是否正在通话
   */
  isInCall(): boolean {
    return this.state !== 'idle' && this.state !== 'error'
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.endCall()
    this.audioPlayer.stop()
    this.stateCallbacks.clear()
    this.errorCallbacks.clear()
    this.recognitionCallbacks.clear()
    this.aiReplyCallbacks.clear()
  }
}
