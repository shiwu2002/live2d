/**
 * 音频录制和播放服务
 * 适配后端协议：PCM格式（16kHz、16bit、单声道、小端序）
 */

export interface AudioRecorderOptions {
  sampleRate?: number // 采样率，默认16000Hz
  channels?: number // 声道数，默认1（单声道）
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private isRecording = false
  private audioChunks: Int16Array[] = []
  private sampleRate: number

  constructor(options: AudioRecorderOptions = {}) {
    this.sampleRate = options.sampleRate || 16000
  }

  /**
   * 请求麦克风权限并初始化录音器
   */
  async initialize(): Promise<void> {
    try {
      // 获取麦克风流
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.sampleRate,
          channelCount: 1
        }
      })

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      })

      console.log(`音频录制器初始化成功，采样率: ${this.audioContext.sampleRate}Hz`)
    } catch (error) {
      console.error('初始化音频录制器失败:', error)
      throw new Error('无法访问麦克风，请检查权限设置')
    }
  }

  /**
   * 开始录音
   */
  start(onAudioData?: (pcmData: ArrayBuffer) => void): void {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('音频录制器未初始化')
    }

    if (this.isRecording) {
      console.warn('录音已在进行中')
      return
    }

    this.audioChunks = []
    this.isRecording = true

    // 创建音频源节点
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

    // 创建音频处理节点（bufferSize: 4096, inputChannels: 1, outputChannels: 1）
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1)

    // 处理音频数据
    this.processorNode.onaudioprocess = (event) => {
      if (!this.isRecording) return

      const inputData = event.inputBuffer.getChannelData(0) // Float32Array
      const pcmData = this.convertFloat32ToPCM16(inputData)
      
      // 存储音频块
      this.audioChunks.push(pcmData)

      // 如果提供了回调，实时发送音频数据
      if (onAudioData) {
        onAudioData(pcmData.buffer as ArrayBuffer)
      }
    }

    // 连接节点
    this.sourceNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)

    console.log('开始录音')
  }

  /**
   * 停止录音并返回完整的PCM数据
   */
  stop(): { pcmData: ArrayBuffer; duration: number; sampleRate: number } {
    if (!this.isRecording) {
      throw new Error('录音未在进行中')
    }

    this.isRecording = false

    // 断开节点
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    // 合并所有音频块
    const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const mergedPCM = new Int16Array(totalLength)
    let offset = 0
    for (const chunk of this.audioChunks) {
      mergedPCM.set(chunk, offset)
      offset += chunk.length
    }

    // 计算时长（毫秒）
    const duration = (totalLength / this.sampleRate) * 1000

    console.log(`录音完成，时长: ${duration.toFixed(0)}ms, 采样数: ${totalLength}`)

    return {
      pcmData: mergedPCM.buffer,
      duration,
      sampleRate: this.sampleRate
    }
  }

  /**
   * 获取录音状态
   */
  getState(): 'recording' | 'inactive' {
    return this.isRecording ? 'recording' : 'inactive'
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.isRecording = false

    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.audioChunks = []
    console.log('音频录制器资源已释放')
  }

  /**
   * 将 Float32Array 转换为 Int16Array (PCM16)
   * 小端序（Little Endian）
   */
  private convertFloat32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      // 将 [-1, 1] 范围的浮点数转换为 [-32768, 32767] 范围的整数
      const sample = float32Array[i] ?? 0
      let s = Math.max(-1, Math.min(1, sample))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return pcm16
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private sourceNode: AudioBufferSourceNode | null = null
  private isPlaying = false

  /**
   * 播放PCM音频数据
   */
  async playPCM(pcmData: ArrayBuffer, sampleRate = 16000): Promise<void> {
    try {
      // 停止当前播放
      this.stop()

      // 创建音频上下文
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      // 将PCM数据转换为Float32
      const pcm16 = new Int16Array(pcmData)
      const float32 = this.convertPCM16ToFloat32(pcm16)

      // 创建音频缓冲区
      const audioBuffer = this.audioContext.createBuffer(1, float32.length, sampleRate)
      const channelData = audioBuffer.getChannelData(0)
      channelData.set(float32)

      // 创建音频源节点
      this.sourceNode = this.audioContext.createBufferSource()
      this.sourceNode.buffer = audioBuffer
      this.sourceNode.connect(this.audioContext.destination)

      // 播放结束后清理
      this.sourceNode.onended = () => {
        this.isPlaying = false
        console.log('音频播放完成')
      }

      // 开始播放
      this.sourceNode.start(0)
      this.isPlaying = true
      console.log('开始播放音频')
    } catch (error) {
      console.error('播放音频失败:', error)
      this.isPlaying = false
      throw new Error('音频播放失败')
    }
  }

  /**
   * 播放普通音频Blob（用于播放录制的音频）
   */
  async playBlob(audioBlob: Blob): Promise<void> {
    try {
      this.stop()

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      // 将Blob转换为ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      
      // 解码音频数据
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer as ArrayBuffer)

      // 创建音频源节点
      this.sourceNode = this.audioContext.createBufferSource()
      this.sourceNode.buffer = audioBuffer
      this.sourceNode.connect(this.audioContext.destination)

      // 播放结束后清理
      this.sourceNode.onended = () => {
        this.isPlaying = false
        console.log('音频播放完成')
      }

      // 开始播放
      this.sourceNode.start(0)
      this.isPlaying = true
      console.log('开始播放音频')
    } catch (error) {
      console.error('播放音频失败:', error)
      this.isPlaying = false
      throw new Error('音频播放失败')
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.sourceNode && this.isPlaying) {
      try {
        this.sourceNode.stop()
        this.sourceNode.disconnect()
      } catch (error) {
        // 忽略已停止的错误
      }
      this.sourceNode = null
      this.isPlaying = false
      console.log('停止播放音频')
    }
  }

  /**
   * 检查是否正在播放
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    console.log('音频播放器资源已释放')
  }

  /**
   * 将 Int16Array (PCM16) 转换为 Float32Array
   */
  private convertPCM16ToFloat32(pcm16: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm16.length)
    for (let i = 0; i < pcm16.length; i++) {
      // 将 [-32768, 32767] 范围的整数转换为 [-1, 1] 范围的浮点数
      const sample = pcm16[i] ?? 0
      float32[i] = sample / (sample < 0 ? 0x8000 : 0x7FFF)
    }
    return float32
  }
}

/**
 * 音频工具函数
 */
export class AudioUtils {
  /**
   * 格式化音频时长
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * 检查浏览器是否支持音频录制
   */
  static isRecordingSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      (typeof window.AudioContext === 'function' || typeof (window as any).webkitAudioContext === 'function')
    )
  }

  /**
   * 请求麦克风权限状态
   */
  static async checkMicrophonePermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      return result.state
    } catch (error) {
      console.warn('无法查询麦克风权限:', error)
      return 'prompt'
    }
  }

  /**
   * 将 ArrayBuffer 转换为 Base64
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0)
    }
    return btoa(binary)
  }

  /**
   * 将 Base64 转换为 ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }
}
