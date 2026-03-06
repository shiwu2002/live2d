/**
 * MP3音频播放器
 * 负责处理流式MP3音频片段的累积和播放
 */

export class AudioPlayer {
  private audioQueue: Blob[] = []
  private isProcessingQueue = false
  private mp3ChunkBuffer: ArrayBuffer[] = [] // 累积 MP3 片段
  private chunkTimeout: number | null = null
  private readonly CHUNK_WAIT_MS = 320 // 等待 320ms 没有新片段后开始播放
  private currentAudio: HTMLAudioElement | null = null
  private volume = 1.0

  /**
   * 播放MP3音频数据
   * @param mp3Data MP3格式的音频数据
   */
  async play(mp3Data: ArrayBuffer): Promise<void> {
    console.log('AudioPlayer.play 被调用，数据大小:', mp3Data.byteLength, 'bytes')
    
    // 验证是否为有效的MP3数据
    const view = new Uint8Array(mp3Data)
    if (view.length >= 2) {
      const firstByte = view[0] as number
      const secondByte = view[1] as number
      const isValidMp3 = (firstByte === 0xFF && (secondByte === 0xFB || secondByte === 0xF3))
      
      if (!isValidMp3) {
        console.warn('收到的数据可能不是有效的MP3格式')
      }
    }

    // 累积MP3片段
    this.mp3ChunkBuffer.push(mp3Data)
    console.log('累积MP3片段，当前缓冲区片段数:', this.mp3ChunkBuffer.length)

    // 清除之前的定时器
    if (this.chunkTimeout !== null) {
      clearTimeout(this.chunkTimeout)
    }

    // 设置新的定时器：如果300ms内没有新片段到达，则合并播放
    this.chunkTimeout = window.setTimeout(() => {
      this.flushChunkBuffer()
    }, this.CHUNK_WAIT_MS)
  }

  /**
   * 合并缓冲区中的所有MP3片段并添加到播放队列
   */
  private flushChunkBuffer(): void {
    if (this.mp3ChunkBuffer.length === 0) {
      return
    }

    console.log('合并MP3片段，共', this.mp3ChunkBuffer.length, '个片段')

    // 计算总大小
    const totalSize = this.mp3ChunkBuffer.reduce((sum, chunk) => sum + chunk.byteLength, 0)
    console.log('合并后总大小:', totalSize, 'bytes')

    // 合并所有片段
    const mergedArray = new Uint8Array(totalSize)
    let offset = 0
    for (const chunk of this.mp3ChunkBuffer) {
      mergedArray.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    // 创建Blob并添加到播放队列
    const blob = new Blob([mergedArray.buffer], { type: 'audio/mpeg' })
    console.log('创建合并后的Blob，大小:', blob.size, 'bytes')
    
    this.audioQueue.push(blob)
    console.log('添加到播放队列，当前队列长度:', this.audioQueue.length)

    // 清空缓冲区
    this.mp3ChunkBuffer = []
    this.chunkTimeout = null

    // 如果没有正在处理队列，则开始处理
    if (!this.isProcessingQueue) {
      this.processQueue()
    }
  }

  /**
   * 处理音频播放队列
   */
  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isProcessingQueue = false
      return
    }

    this.isProcessingQueue = true
    const blob = this.audioQueue.shift()!
    
    try {
      console.log('开始播放Blob，大小:', blob.size, 'bytes')
      await this.playBlob(blob)
      console.log('Blob播放完成')
    } catch (error) {
      console.error('播放MP3音频失败:', error)
    }

    // 继续处理下一个
    this.processQueue()
  }

  /**
   * 播放单个 Blob
   */
  private async playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(blob)
        
      audio.src = url
      audio.volume = this.volume
        
      this.currentAudio = audio
        
      audio.onended = () => {
        console.log('音频播放结束，释放资源')
        URL.revokeObjectURL(url)
        this.currentAudio = null
        resolve()
      }
        
      audio.onerror = (error) => {
        console.error('Audio 元素播放错误:', error)
        URL.revokeObjectURL(url)
        this.currentAudio = null
        reject(error)
      }
        
      audio.play().catch((error) => {
        console.error('调用 audio.play() 失败:', error)
        URL.revokeObjectURL(url)
        this.currentAudio = null
        reject(error)
      })
    })
  }

  /**
   * 停止播放并清空队列
   */
  stop(): void {
    console.log('停止播放，清空队列')
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    this.audioQueue = []
    this.mp3ChunkBuffer = []
    if (this.chunkTimeout !== null) {
      clearTimeout(this.chunkTimeout)
      this.chunkTimeout = null
    }
    this.isProcessingQueue = false
  }

  /**
   * 设置音量
   * @param volume 音量值，范围 0.0 - 1.0
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume
    }
    console.log('音量设置为:', this.volume)
  }

  /**
   * 获取当前音量
   * @returns 音量值，范围 0.0 - 1.0
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * 强制刷新缓冲区（立即合并并播放当前累积的片段）
   */
  forceFlush(): void {
    if (this.chunkTimeout !== null) {
      clearTimeout(this.chunkTimeout)
      this.chunkTimeout = null
    }
    this.flushChunkBuffer()
  }
}
