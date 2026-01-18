/**
 * 音频录制服务
 * 用于录制麦克风音频并转换为PCM格式
 */

export interface AudioRecorderConfig {
  sampleRate: number      // 采样率
  channelCount: number    // 声道数
  bitDepth: number        // 采样位数
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private isRecording = false
  private config: AudioRecorderConfig
  private dataCallback: ((data: ArrayBuffer) => void) | null = null

  constructor(config: Partial<AudioRecorderConfig> = {}) {
    this.config = {
      sampleRate: config.sampleRate || 16000,
      channelCount: config.channelCount || 1,
      bitDepth: config.bitDepth || 16
    }
  }

  /**
   * 初始化并开始录音
   */
  async start(onData: (data: ArrayBuffer) => void): Promise<void> {
    if (this.isRecording) {
      console.warn('录音已在进行中')
      return
    }

    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // 创建音频上下文
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      })

      // 创建音频源节点
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

      // 创建处理器节点（缓冲区大小）
      const bufferSize = 4096
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        this.config.channelCount,
        this.config.channelCount
      )

      this.dataCallback = onData

      // 处理音频数据
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) return

        const inputBuffer = event.inputBuffer
        const channelData = inputBuffer.getChannelData(0) // 获取第一个声道

        // 将Float32转换为Int16 PCM
        const pcmData = this.floatTo16BitPCM(channelData)
        
        if (this.dataCallback) {
          // 创建一个新的ArrayBuffer来避免类型问题
          const buffer = new ArrayBuffer(pcmData.byteLength)
          new Uint8Array(buffer).set(new Uint8Array(pcmData.buffer))
          this.dataCallback(buffer)
        }
      }

      // 连接节点
      this.sourceNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)

      this.isRecording = true
      console.log('录音已开始', this.config)
    } catch (error) {
      console.error('启动录音失败:', error)
      throw error
    }
  }

  /**
   * 停止录音
   */
  stop(): void {
    if (!this.isRecording) {
      return
    }

    this.isRecording = false

    // 断开节点
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode.onaudioprocess = null
      this.processorNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.dataCallback = null
    console.log('录音已停止')
  }

  /**
   * 将Float32音频数据转换为Int16 PCM格式
   */
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length)
    
    for (let i = 0; i < float32Array.length; i++) {
      // 将[-1, 1]范围的浮点数转换为[-32768, 32767]范围的整数
      const value = float32Array[i] ?? 0 // 添加空值保护
      let sample = Math.max(-1, Math.min(1, value))
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      int16Array[i] = Math.floor(sample)
    }
    
    return int16Array
  }

  /**
   * 获取录音状态
   */
  getIsRecording(): boolean {
    return this.isRecording
  }

  /**
   * 获取配置信息
   */
  getConfig(): AudioRecorderConfig {
    return { ...this.config }
  }

  /**
   * 暂停录音
   */
  pause(): void {
    this.isRecording = false
  }

  /**
   * 恢复录音
   */
  resume(): void {
    if (this.audioContext && this.processorNode) {
      this.isRecording = true
    }
  }
}
