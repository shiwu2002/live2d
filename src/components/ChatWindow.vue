<template>
  <div class="chat-window" :class="{ 'minimized': isMinimized }" :style="chatWindowStyle">
    <!-- 聊天窗口头部 -->
    <div class="chat-header" @mousedown="startDrag">
      <div class="header-left">
        <span class="status-dot" :class="{ 'connected': isConnected }"></span>
        <span class="header-title">{{ modeText }}</span>
        <span class="connection-status">{{ connectionText }}</span>
      </div>
      <div class="header-actions">
        <button class="header-btn" @click="toggleMinimize" :title="isMinimized ? '展开' : '最小化'">
          {{ isMinimized ? '□' : '−' }}
        </button>
        <button class="header-btn" @click="toggleVisible" title="关闭">
          ✕
        </button>
      </div>
    </div>

    <!-- 聊天内容区域 -->
    <div class="chat-body" v-show="!isMinimized" ref="chatBody" @scroll="handleScroll">
      <div class="messages-container">
        <!-- 历史加载状态 -->
        <div v-if="isLoadingHistory" class="history-loading">加载历史记录中...</div>
        <div v-else-if="!hasMoreHistory && messages.length > 0" class="history-end">— 已加载全部历史 —</div>

        <div
          v-for="message in displayMessages"
          :key="message.id"
          class="message-item"
          :class="[`message-${message.sender}`]"
        >
          <!-- 文本消息 -->
          <div v-if="message.type === 'TEXT'" class="message-bubble text-message">
            <div class="message-content">{{ getTextContent(message.content) }}</div>
            <div class="message-time">{{ formatTime(message.timestamp ?? Date.now()) }}</div>
          </div>

          <!-- 语音消息 -->
          <div v-else-if="message.type === 'AUDIO'" class="message-bubble voice-message">
            <button 
              class="voice-play-btn"
              @click="playVoiceMessage(message)"
              :disabled="isPlayingVoice && currentPlayingId === message.id"
            >
              <span v-if="isPlayingVoice && currentPlayingId === message.id">⏸</span>
              <span v-else>▶</span>
            </button>
            <div class="voice-info">
              <div class="voice-duration">{{ formatDuration(message.duration ?? 0) }}</div>
              <div class="message-time">{{ formatTime(message.timestamp ?? Date.now()) }}</div>
            </div>
          </div>

          <!-- 图片消息 -->
          <div v-else-if="message.type === 'IMAGES'" class="image-message-wrapper">
            <img
              v-for="(img, idx) in getImageUrls(message.content)"
              :key="idx"
              :src="img"
              :alt="`图片${idx + 1}`"
              class="image-direct"
              @click="previewImage(img)"
            />
          </div>

          <!-- 控制消息 -->
          <div v-else-if="message.type === 'CONTROL'" class="message-bubble control-message">
            <div class="message-content">{{ getControlText(message.content) }}</div>
            <div class="message-time">{{ formatTime(message.timestamp ?? Date.now()) }}</div>
          </div>

          <!-- 错误消息 -->
          <div v-else-if="message.type === 'ERROR'" class="message-bubble error-message">
            <div class="message-content">❌ {{ getTextContent(message.content) }}</div>
            <div class="message-time">{{ formatTime(message.timestamp ?? Date.now()) }}</div>
          </div>
        </div>

        <!-- 空状态提示 -->
        <div v-if="displayMessages.length === 0" class="empty-state">
          <div class="empty-icon">💕</div>
        <div class="empty-text">暂无消息，开始聊天吧~</div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-footer" v-show="!isMinimized">
      <!-- 语音通话模式 -->
      <div v-if="mode === 'voice'" class="voice-call-controls">
        <button 
          v-if="!isInVoiceCall"
          class="voice-call-btn start-call"
          @click="startVoiceCall"
          :disabled="!isConnected"
        >
          📞 发起语音通话
        </button>
        <div v-else class="voice-call-active">
          <div class="call-status">
            <span class="call-icon">📞</span>
            <span class="call-text">通话中</span>
            <span class="call-time">{{ formatCallDuration(voiceCallDuration) }}</span>
          </div>
          <button 
            class="voice-call-btn end-call"
            @click="endVoiceCall"
          >
            ❌ 结束通话
          </button>
        </div>
      </div>

      <!-- 文本聊天模式 -->
      <div v-else class="input-container">
        <!-- 隐藏的图片文件选择器 -->
        <input
          ref="imageInputRef"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style="display: none"
          @change="handleImageSelect"
        />

        <textarea
          v-model="inputText"
          class="text-input"
          placeholder="说点什么吧~"
          rows="1"
          @keydown.enter.exact.prevent="sendTextMessage"
          @keydown.shift.enter.exact="handleShiftEnter"
          :disabled="!isConnected"
        ></textarea>

        <div class="input-actions">
          <!-- 图片上传按钮 -->
          <button
            class="action-btn image-btn"
            @click="triggerImageSelect"
            :disabled="!isConnected || isUploadingImage"
            :title="isUploadingImage ? '上传中...' : '发送图片'"
          >
            <span v-if="isUploadingImage" class="spinner"></span>
            <img v-else src="../images/图片.png" class="image-btn-icon" alt="图片" />
          </button>

          <!-- 发送按钮 -->
          <button
            class="action-btn send-btn"
            @click="sendTextMessage"
            :disabled="!isConnected || !inputText.trim()"
            title="发送消息"
          >
            ➤
          </button>
        </div>
      </div>

      <!-- 图片预览区域 -->
      <div v-if="imagePreviewUrl && !isUploadingImage" class="image-preview-bar">
        <img :src="imagePreviewUrl" alt="预览" class="preview-thumb" />
        <span class="preview-name">{{ selectedImageFile?.name ?? '' }}</span>
        <button class="preview-send-btn" @click="sendImage" :disabled="!isConnected">
          发送图片
        </button>
        <button class="preview-cancel-btn" @click="cancelImageSelect">✕</button>
      </div>

    </div>
  </div>

  <!-- 图片灯箱 -->
  <div v-if="imageLightboxUrl" class="lightbox-overlay" @click="closeLightbox">
    <img :src="imageLightboxUrl" class="lightbox-image" @click.stop />
    <button class="lightbox-close" @click="closeLightbox">✕</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { WebSocketService, type WebSocketConfig } from '../services/websocket'
import type { ExtendedChatMessage } from '../types/chat'
import type { Live2DAnimationCommand } from '../types/live2d'
import { AudioRecorder, AudioPlayer, AudioUtils } from '../services/audio'
import { uploadService } from '../services/uploadService'
import { chatHistoryService, type HistoryRecord } from '../services/chatHistoryService'
import {
  getTextContent,
  getImageUrls,
  getControlText
} from '../utils/message'
import {
  formatTime,
  formatDuration,
  formatCallDuration
} from '../utils/time'

const props = withDefaults(defineProps<{
  wsUrl: string
  openid?: string
  aiSessionId?: string
  mode?: 'text' | 'voice'
  visible?: boolean
}>(), {
  mode: 'text',
  visible: true
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:visible', value: boolean): void
  (e: 'animation', command: Live2DAnimationCommand): void
}>()

// WebSocket 和音频服务
let wsService: WebSocketService | null = null
let audioRecorder: AudioRecorder | null = null
let audioPlayer: AudioPlayer | null = null

// 状态管理
const messages = ref<ExtendedChatMessage[]>([])
const inputText = ref('')
const isConnected = ref(false)
const isMinimized = ref(false)
const isPlayingVoice = ref(false)
const currentPlayingId = ref<string | null>(null)
const voiceSupported = ref(false)
const isInVoiceCall = ref(false)
const voiceCallDuration = ref(0)
const isCleaningUp = ref(false)
const imageInputRef = ref<HTMLInputElement | null>(null)
const isUploadingImage = ref(false)
const selectedImageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string>('')
const imageLightboxUrl = ref<string>('')
const isLoadingHistory = ref(false)
const hasMoreHistory = ref(true)
const historyNextId = ref<number | undefined>(undefined)

// 计算属性：过滤只显示聊天相关的消息（TEXT、IMAGES和AUDIO）
const displayMessages = computed<ExtendedChatMessage[]>(() => {
  return messages.value.filter((msg): msg is ExtendedChatMessage => {
    // 只显示文本消息、图片消息和音频消息
    return msg.type === 'TEXT' || msg.type === 'IMAGES' || msg.type === 'AUDIO'
  })
})

// 引用
const chatBody = ref<HTMLElement | null>(null)

// 可拖拽位置状态（聊天框改为浮动小弹窗）
const posX = ref<number>(0)
const posY = ref<number>(0)
const dragging = ref(false)
let dragOffsetX = 0
let dragOffsetY = 0
const chatWindowStyle = computed(() => {
  const maxW = Math.max(320, Math.min(380, window.innerWidth - 20))
  const maxH = Math.max(360, Math.min(520, window.innerHeight - 100))
  return {
    position: 'fixed',
    left: `${posX.value}px`,
    top: `${posY.value}px`,
    width: `${maxW}px`,
    height: isMinimized.value ? '60px' : `${maxH}px`,
  } as Record<string, string>
})

const startDrag = (e: MouseEvent) => {
  dragging.value = true
  dragOffsetX = e.clientX - posX.value
  dragOffsetY = e.clientY - posY.value
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', endDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!dragging.value) return
  const w = window.innerWidth
  const h = window.innerHeight
  const width = Math.max(320, Math.min(380, w - 20))
  const height = isMinimized.value ? 60 : Math.max(360, Math.min(520, h - 100))
  posX.value = Math.min(Math.max(0, e.clientX - dragOffsetX), w - width)
  posY.value = Math.min(Math.max(0, e.clientY - dragOffsetY), h - height)
}

const endDrag = () => {
  dragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
}

// 计时器
let voiceCallTimer: number | null = null

// 计算属性
const connectionText = computed(() => {
  return isConnected.value ? '已连接' : '未连接'
})

const modeText = computed(() => {
  return props.mode === 'voice' ? '语音通话' : '文本聊天'
})

/**
 * 初始化服务
 */
const initializeServices = async () => {
  try {
    // 检查语音支持
    voiceSupported.value = AudioUtils.isRecordingSupported()

    // 构建 WebSocket 配置
    const config: WebSocketConfig = {
      baseUrl: props.wsUrl,
      openid: props.openid,
      aiSessionId: props.aiSessionId,
      mode: props.mode
    }

    // 初始化 WebSocket
    wsService = new WebSocketService(config)
    
    // 订阅事件
    wsService.onMessage(handleMessage)
    wsService.onConnection(handleConnection)
    wsService.onError(handleError)

    // 连接 WebSocket
    await wsService.connect()

    // 初始化音频服务
    if (voiceSupported.value) {
      audioRecorder = new AudioRecorder()
      audioPlayer = new AudioPlayer()
    }

    console.log('聊天服务初始化成功')

    // 加载历史记录
    loadHistory()
  } catch (error) {
    console.error('初始化聊天服务失败:', error)
    alert('连接失败，请检查 WebSocket 服务器地址')
  }
}

/**
 * 将历史记录转为前端消息格式
 */
const historyToMessage = (record: HistoryRecord): ExtendedChatMessage => {
  if (record.messageType === 'image') {
    return {
      id: String(record.id),
      type: 'IMAGES',
      content: { urls: [record.content] },
      sender: record.sender,
      timestamp: new Date(record.createTime).getTime()
    } as ExtendedChatMessage
  }
  return {
    id: String(record.id),
    type: record.messageType.toUpperCase(),
    content: record.content,
    sender: record.sender,
    timestamp: new Date(record.createTime).getTime()
  } as ExtendedChatMessage
}

/**
 * 加载聊天历史
 */
const loadHistory = async () => {
  if (!props.openid || isLoadingHistory.value || !hasMoreHistory.value) return

  isLoadingHistory.value = true
  try {
    const page = await chatHistoryService.fetchHistory(
      props.openid,
      historyNextId.value,
      20
    )
    if (page.records.length === 0) {
      hasMoreHistory.value = false
      return
    }

    const historyMessages = page.records.map(historyToMessage).reverse()
    messages.value.unshift(...historyMessages)

    historyNextId.value = page.nextId ?? undefined
    if (!page.nextId) hasMoreHistory.value = false
  } catch (error) {
    console.error('加载聊天历史失败:', error)
  } finally {
    isLoadingHistory.value = false
  }
}

/**
 * 处理滚动（触顶加载更多历史）
 */
const handleScroll = () => {
  if (!chatBody.value || isLoadingHistory.value || !hasMoreHistory.value) return
  if (chatBody.value.scrollTop <= 30) {
    const prevHeight = chatBody.value.scrollHeight
    loadHistory().then(() => {
      nextTick(() => {
        if (chatBody.value) {
          chatBody.value.scrollTop = chatBody.value.scrollHeight - prevHeight
        }
      })
    })
  }
}

/**
 * 处理接收到的消息
 */
const handleMessage = (message: ExtendedChatMessage) => {
  messages.value.push(message)
  
  if (message.animation) {
    emit('animation', message.animation)
  }
  
  if (props.mode === 'voice' && message.type === 'AUDIO' && message.sender === 'ai') {
    playVoiceMessage(message)
  }
  
  nextTick(() => {
    scrollToBottom()
  })
}

/**
 * 处理连接状态变化
 */
const handleConnection = (connected: boolean) => {
  isConnected.value = connected
  
  if (connected) {
    console.log('WebSocket 已连接')
    // 发送连接打开控制消息
    if (wsService) {
      wsService.sendControl('open_websocket')
    }
  } else {
    console.log('WebSocket 已断开')
    // 如果正在通话，结束通话
    if (isInVoiceCall.value) {
      endVoiceCall()
    }
  }
}

/**
 * 处理错误
 */
const handleError = (error: Error) => {
  console.error('聊天错误:', error)
  alert(`错误: ${error.message}`)
}

/**
 * 预览图片（灯箱）
 */
const previewImage = (url: string) => {
  imageLightboxUrl.value = url
}

/**
 * 关闭灯箱
 */
const closeLightbox = () => {
  imageLightboxUrl.value = ''
}

/**
 * 触发图片选择
 */
const triggerImageSelect = () => {
  imageInputRef.value?.click()
}

/**
 * 处理图片选择
 */
const handleImageSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 校验
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    alert('不支持的图片格式，请选择 JPG/PNG/GIF/WebP 格式')
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    alert('图片大小不能超过 50MB')
    return
  }

  selectedImageFile.value = file
  imagePreviewUrl.value = URL.createObjectURL(file)
  // 重置 input 以便重复选择同一文件
  input.value = ''
}

/**
 * 压缩图片（超过 2MB 时缩至 1920px 宽以内）
 */
const compressImage = async (file: File): Promise<Blob> => {
  if (file.size < 2 * 1024 * 1024) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > 1920) {
        height = Math.round((height * 1920) / width)
        width = 1920
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('压缩失败'))),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 发送图片（上传 → WebSocket）
 */
const sendImage = async () => {
  if (!selectedImageFile.value || !wsService || !isConnected.value || isUploadingImage.value) return

  isUploadingImage.value = true
  try {
    const compressed = await compressImage(selectedImageFile.value)
    const result = await uploadService.uploadImage(
      compressed instanceof File ? compressed : new File([compressed], selectedImageFile.value.name || 'image.jpg', { type: 'image/jpeg' })
    )
    if (result.code !== 200) throw new Error(result.msg || '上传失败')

    wsService.sendImages([result.data!])
    cancelImageSelect()
  } catch (error) {
    console.error('发送图片失败:', error)
    alert(`发送图片失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    isUploadingImage.value = false
  }
}

/**
 * 取消图片选择
 */
const cancelImageSelect = () => {
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  selectedImageFile.value = null
  imagePreviewUrl.value = ''
}

/**
 * 发送文本消息
 */
const sendTextMessage = () => {
  const text = inputText.value.trim()
  
  if (!text || !wsService || !isConnected.value) {
    return
  }

  const success = wsService.sendText(text)
  
  if (success) {
    inputText.value = ''
  }
}

/**
 * 处理 Shift+Enter（换行）
 */
const handleShiftEnter = (event: KeyboardEvent) => {
  // 允许换行
  const target = event.target as HTMLTextAreaElement
  const start = target.selectionStart
  const end = target.selectionEnd
  inputText.value = inputText.value.substring(0, start) + '\n' + inputText.value.substring(end)
  
  nextTick(() => {
    target.selectionStart = target.selectionEnd = start + 1
  })
}

/**
 * 播放语音消息
 */
const playVoiceMessage = async (message: ExtendedChatMessage) => {
  if (message.type !== 'AUDIO' || !audioPlayer) {
    return
  }

  try {
    // 如果正在播放同一条消息，则停止
    if (isPlayingVoice.value && currentPlayingId.value === message.id) {
      audioPlayer.stop()
      isPlayingVoice.value = false
      currentPlayingId.value = null
      return
    }

    // 播放语音
    currentPlayingId.value = message.id ?? null
    isPlayingVoice.value = true
    
    // 根据消息内容类型决定播放方式
    const content = message.content
    
    // 使用类型断言处理content
    if (typeof content === 'object' && content !== null) {
      const objContent = content as any
      if (objContent instanceof ArrayBuffer) {
        await audioPlayer.playPCM(objContent as ArrayBuffer, 16000)
      } else if (objContent instanceof Blob) {
        await audioPlayer.playBlob(objContent as Blob)
      } else {
        console.error('不支持的音频格式', objContent.constructor?.name || typeof objContent)
      }
    } else {
      console.error('不支持的音频格式', typeof content)
    }
    
    // 播放完成
    isPlayingVoice.value = false
    currentPlayingId.value = null
  } catch (error) {
    console.error('播放语音失败:', error)
    isPlayingVoice.value = false
    currentPlayingId.value = null
  }
}

/**
 * 发起语音通话
 */
const startVoiceCall = async () => {
  if (!audioRecorder || !wsService || !isConnected.value || isInVoiceCall.value) {
    return
  }

  try {
    // 初始化录音器
    if (audioRecorder.getState() === 'inactive') {
      await audioRecorder.initialize()
    }

    // 发送通话请求
    wsService.sendControl('voice_call_request')

    // 开始录音并实时发送
    audioRecorder.start((pcmData: ArrayBuffer) => {
      if (wsService && isInVoiceCall.value) {
        wsService.sendAudio(pcmData)
      }
    })

    isInVoiceCall.value = true
    voiceCallDuration.value = 0

    // 启动通话计时器
    voiceCallTimer = window.setInterval(() => {
      voiceCallDuration.value++
    }, 1000)

    console.log('语音通话已开始')
  } catch (error) {
    console.error('发起语音通话失败:', error)
    alert('无法访问麦克风，请检查权限设置')
    isInVoiceCall.value = false
  }
}

/**
 * 结束语音通话
 */
const endVoiceCall = () => {
  if (!isInVoiceCall.value) {
    return
  }

  // 停止计时器
  if (voiceCallTimer !== null) {
    clearInterval(voiceCallTimer)
    voiceCallTimer = null
  }

  // 停止录音
  if (audioRecorder) {
    try {
      audioRecorder.stop()
    } catch (error) {
      console.error(error)
    }
  }

  // 发送结束通话控制消息
  if (wsService) {
    wsService.sendControl('voice_call_end')
  }

  isInVoiceCall.value = false
  console.log('语音通话已结束')
}

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  if (chatBody.value) {
    chatBody.value.scrollTop = chatBody.value.scrollHeight
  }
}

/**
 * 切换最小化
 */
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

/**
 * 切换可见性
 */
const toggleVisible = () => {
  emit('update:visible', false)
  emit('close')
}

/**
 * 清理WebSocket连接和资源
 */
const cleanupConnection = () => {
  // 防止重复清理
  if (isCleaningUp.value) {
    return
  }
  
  isCleaningUp.value = true
  
  try {
    if (voiceCallTimer !== null) {
      clearInterval(voiceCallTimer)
      voiceCallTimer = null
    }

    // 结束语音通话
    if (isInVoiceCall.value) {
      endVoiceCall()
    }

    // 只在连接状态下才发送关闭控制消息
    if (wsService && isConnected.value) {
      wsService.sendControl('close_websocket')
    }

    // 断开WebSocket连接
    if (wsService) {
      wsService.disconnect()
      wsService = null
    }

    // 清理音频服务
    if (audioRecorder) {
      audioRecorder.dispose()
      audioRecorder = null
    }

    if (audioPlayer) {
      audioPlayer.dispose()
      audioPlayer = null
    }
  } catch (error) {
    console.error('清理连接时出错:', error)
  } finally {
    isCleaningUp.value = false
  }
}

// 监听 visible 属性变化
watch(() => props.visible, (newVal) => {
  if (!newVal && wsService) {
    // 关闭时清理连接
    cleanupConnection()
  } else if (newVal && !wsService && !isCleaningUp.value) {
    // 打开时重新连接
    initializeServices()
  }
})

// 生命周期
onMounted(() => {
  // 设定初始位置为右下角的紧凑弹窗
  const w = window.innerWidth
  const h = window.innerHeight
  const initW = Math.max(320, Math.min(380, w - 20))
  const initH = Math.max(360, Math.min(520, h - 100))
  posX.value = Math.max(0, w - initW - 20)
  posY.value = Math.max(0, h - initH - 20)

  if (props.visible !== false) {
    initializeServices()
  }
})

onBeforeUnmount(() => {
  // 统一清理资源
  cleanupConnection()
})
</script>

<style scoped>
.chat-window {
  position: fixed;
  width: 380px;
  height: 520px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(255, 107, 157, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1001;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  border: 1.5px solid rgba(255, 107, 157, 0.15);
}

.chat-window.minimized {
  height: 60px;
}

.chat-window.minimized {
  transform: translateY(calc(100% - 60px));
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
  transition: background 0.3s ease;
}

.status-dot.connected {
  background: #FF8A9E;
  box-shadow: 0 0 8px rgba(255, 138, 158, 0.6);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.connection-status {
  font-size: 12px;
  opacity: 0.9;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #FFF5F9;
  min-height: 300px;
  max-height: 400px;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-loading,
.history-end {
  text-align: center;
  font-size: 12px;
  color: #C44569;
  padding: 8px 0;
  opacity: 0.7;
}

.message-item {
  display: flex;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-user {
  justify-content: flex-end;
}

.message-other,
.message-system {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.1);
}

.message-user .message-bubble {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  border-radius: 16px 16px 4px 16px;
}

.message-other .message-bubble,
.message-ai .message-bubble {
  border-radius: 16px 16px 16px 4px;
  border: 1px solid #FFE0EB;
}

.text-message .message-content {
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
  margin-bottom: 4px;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  text-align: right;
}

.voice-message {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}

.voice-play-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 107, 157, 0.1);
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.message-user .voice-play-btn {
  background: rgba(255, 255, 255, 0.3);
}

.voice-play-btn:hover {
  transform: scale(1.1);
}

.voice-play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-info {
  flex: 1;
}

.voice-duration {
  font-weight: 500;
  margin-bottom: 2px;
}

.image-message-wrapper {
  max-width: 70%;
}

.image-direct {
  width: 100%;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease;
  display: block;
}

.image-direct:hover {
  transform: scale(1.02);
}

.control-message,
.error-message {
  background: #FFF0F5;
  color: #C44569;
  font-size: 13px;
}

.error-message {
  background: #FFE0EB;
  color: #C44569;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #FF8A9E;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: #C44569;
}

.chat-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid #FFE0EB;
}

.input-container {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #FFD0E0;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  max-height: 100px;
  background: #FFF5F9;
}

.text-input:focus {
  border-color: #FF6B9D;
}

.text-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.voice-btn {
  background: #FFF0F5;
  color: #FF6B9D;
}

.voice-btn:hover:not(:disabled) {
  background: #FFE0EB;
  transform: scale(1.05);
}

.voice-btn.recording {
  background: #FF6B9D;
  color: white;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.send-btn {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3);
}

.image-btn {
  background: #FFF0F5;
  color: #FF6B9D;
  position: relative;
}

.image-btn:hover:not(:disabled) {
  background: #FFE0EB;
  transform: scale(1.05);
}

.image-btn-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 107, 157, 0.2);
  border-top-color: #FF6B9D;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.image-preview-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #FFF5F9;
  border-top: 1px solid #FFE0EB;
}

.preview-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #FFD0E0;
}

.preview-name {
  flex: 1;
  font-size: 12px;
  color: #C44569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-send-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(255, 107, 157, 0.3);
}

.preview-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview-cancel-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 107, 157, 0.1);
  color: #C44569;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-cancel-btn:hover {
  background: rgba(255, 107, 157, 0.2);
}

/* 图片灯箱 */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 12px;
  cursor: default;
}

.lightbox-close {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.voice-call-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-call-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.voice-call-btn.start-call {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
}

.voice-call-btn.start-call:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3);
}

.voice-call-btn.end-call {
  background: #FF6B9D;
  color: white;
}

.voice-call-btn.end-call:hover {
  background: #C44569;
}

.voice-call-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-call-active {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.call-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #FFF0F5;
  border-radius: 12px;
}

.call-icon {
  font-size: 20px;
}

.call-text {
  flex: 1;
  font-weight: 600;
  color: #C44569;
}

.call-time {
  font-family: monospace;
  font-size: 16px;
  color: #C44569;
}

.chat-body::-webkit-scrollbar {
  width: 6px;
}

.chat-body::-webkit-scrollbar-track {
  background: transparent;
}

.chat-body::-webkit-scrollbar-thumb {
  background: rgba(255, 107, 157, 0.2);
  border-radius: 3px;
}

.chat-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 107, 157, 0.3);
}

@media (max-width: 768px) {
  .chat-window {
    left: 10px;
    right: 10px;
    bottom: 10px;
    width: auto;
    max-width: none;
    max-height: 70vh;
  }
  
  .chat-window.minimized {
    max-height: 50px;
  }
  
  .chat-header {
    padding: 12px 14px;
  }
  
  .header-title {
    font-size: 14px;
  }
  
  .connection-status {
    font-size: 11px;
  }
  
  .header-btn {
    width: 26px;
    height: 26px;
    font-size: 14px;
  }
  
  .chat-body {
    min-height: 200px;
    max-height: calc(70vh - 200px);
    padding: 12px;
  }
  
  .message-bubble {
    max-width: 80%;
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .message-time {
    font-size: 10px;
  }
  
  .voice-message {
    min-width: 120px;
  }
  
  .voice-play-btn {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .voice-duration {
    font-size: 13px;
  }
  
  .image-message {
    max-width: 85%;
  }
  
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 6px;
  }
  
  .chat-footer {
    padding: 12px;
  }
  
  .text-input {
    padding: 8px 10px;
    font-size: 14px;
    max-height: 80px;
  }
  
  .action-btn {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  
  .voice-call-btn {
    padding: 10px;
    font-size: 14px;
  }
  
  .call-icon {
    font-size: 18px;
  }
  
  .call-time {
    font-size: 14px;
  }
  
  .recording-indicator {
    margin-top: 8px;
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .empty-state {
    padding: 40px 20px;
  }
  
  .empty-icon {
    font-size: 36px;
  }
  
  .empty-text {
    font-size: 13px;
  }
}

@media (max-width: 375px) {
  .chat-window {
    max-height: 65vh;
  }
  
  .chat-body {
    max-height: calc(65vh - 180px);
  }
  
  .message-bubble {
    max-width: 85%;
    padding: 6px 10px;
    font-size: 13px;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .input-actions {
    gap: 6px;
  }
}
</style>
