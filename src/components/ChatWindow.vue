<template>
  <div class="chat-window" :class="{ 'minimized': isMinimized }">
    <!-- 聊天窗口头部 -->
    <div class="chat-header">
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
    <div class="chat-body" v-show="!isMinimized" ref="chatBody">
      <div class="messages-container">
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
          <div v-else-if="message.type === 'IMAGES'" class="message-bubble image-message">
            <div class="image-grid">
              <img 
                v-for="(img, idx) in getImageUrls(message.content)" 
                :key="idx"
                :src="img" 
                :alt="`图片${idx + 1}`"
                @click="previewImage(img)"
              />
            </div>
            <div class="message-time">{{ formatTime(message.timestamp ?? Date.now()) }}</div>
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
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无消息</div>
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
        <textarea
          v-model="inputText"
          class="text-input"
          placeholder="输入消息..."
          rows="1"
          @keydown.enter.exact.prevent="sendTextMessage"
          @keydown.shift.enter.exact="handleShiftEnter"
          :disabled="!isConnected"
        ></textarea>
        
        <div class="input-actions">
          <!-- 语音录制按钮 -->
          <button 
            class="action-btn voice-btn"
            :class="{ 'recording': isRecording }"
            @mousedown="startRecording"
            @mouseup="stopRecording"
            @mouseleave="cancelRecording"
            @touchstart.prevent="startRecording"
            @touchend.prevent="stopRecording"
            :disabled="!isConnected || !voiceSupported"
            :title="voiceSupported ? (isRecording ? '松开发送' : '按住说话') : '浏览器不支持录音'"
          >
            <span v-if="isRecording">🎙️</span>
            <span v-else>🎤</span>
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

      <!-- 录音提示 -->
      <div v-if="isRecording" class="recording-indicator">
        <span class="recording-dot"></span>
        <span class="recording-text">正在录音...</span>
        <span class="recording-time">{{ recordingTime }}s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { WebSocketService, type WebSocketConfig } from '../services/websocket'
import type { ExtendedChatMessage } from '../types/chat'
import { AudioRecorder, AudioPlayer, AudioUtils } from '../services/audio'
import { 
  isDisplayableMessage, 
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
const isRecording = ref(false)
const isPlayingVoice = ref(false)
const currentPlayingId = ref<string | null>(null)
const recordingTime = ref(0)
const voiceSupported = ref(false)
const isInVoiceCall = ref(false)
const voiceCallDuration = ref(0)
const isCleaningUp = ref(false)

// 计算属性：过滤只显示聊天相关的消息（TEXT、IMAGES和AUDIO）
const displayMessages = computed<ExtendedChatMessage[]>(() => {
  return messages.value.filter((msg): msg is ExtendedChatMessage => {
    // 只显示文本消息、图片消息和音频消息
    return msg.type === 'TEXT' || msg.type === 'IMAGES' || msg.type === 'AUDIO'
  })
})

// 引用
const chatBody = ref<HTMLElement | null>(null)

// 计时器
let recordingTimer: number | null = null
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
  } catch (error) {
    console.error('初始化聊天服务失败:', error)
    alert('连接失败，请检查 WebSocket 服务器地址')
  }
}

/**
 * 处理接收到的消息
 */
const handleMessage = (message: ExtendedChatMessage) => {
  messages.value.push(message)
  
  // 如果是语音通话模式的音频消息，自动播放
  if (props.mode === 'voice' && message.type === 'AUDIO' && message.sender === 'ai') {
    playVoiceMessage(message)
  }
  
  // 滚动到底部
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
 * 预览图片
 */
const previewImage = (url: string) => {
  window.open(url, '_blank')
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
 * 开始录音
 */
const startRecording = async () => {
  if (!audioRecorder || !wsService || !isConnected.value || isRecording.value) {
    return
  }

  try {
    // 初始化录音器（如果还没初始化）
    if (audioRecorder.getState() === 'inactive') {
      await audioRecorder.initialize()
    }

    // 开始录音
    audioRecorder.start()
    isRecording.value = true
    recordingTime.value = 0

    // 启动计时器
    recordingTimer = window.setInterval(() => {
      recordingTime.value++
    }, 1000)

    console.log('开始录音')
  } catch (error) {
    console.error('启动录音失败:', error)
    alert('无法访问麦克风，请检查权限设置')
    isRecording.value = false
  }
}

/**
 * 停止录音并发送
 */
const stopRecording = async () => {
  if (!audioRecorder || !wsService || !isRecording.value) {
    return
  }

  try {
    // 停止计时器
    if (recordingTimer !== null) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }

    // 停止录音
    const { pcmData, duration } = audioRecorder.stop()
    isRecording.value = false

    // 发送语音消息
    if (duration > 500) { // 至少录音0.5秒
      wsService.sendAudio(pcmData)
      console.log('语音消息已发送')
    } else {
      console.log('录音时间太短，已取消')
    }
  } catch (error) {
    console.error('停止录音失败:', error)
    isRecording.value = false
  }
}

/**
 * 取消录音
 */
const cancelRecording = () => {
  if (!isRecording.value) {
    return
  }

  if (recordingTimer !== null) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }

  if (audioRecorder) {
    try {
      audioRecorder.stop()
    } catch (error) {
      console.error(error)
    }
  }

  isRecording.value = false
  console.log('录音已取消')
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
    // 清理计时器
    if (recordingTimer !== null) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }

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
  bottom: 20px;
  left: 20px;
  width: 380px;
  max-height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
  transition: all 0.3s ease;
}

.chat-window.minimized {
  max-height: 60px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
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
  border-radius: 6px;
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
  background: #f5f5f5;
  min-height: 300px;
  max-height: 400px;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.text-message .message-content {
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.4;
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
  background: rgba(0, 0, 0, 0.1);
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

.image-message {
  max-width: 80%;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.image-grid img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-grid img:hover {
  transform: scale(1.05);
}

.control-message,
.error-message {
  background: #f0f0f0;
  color: #666;
  font-size: 13px;
}

.error-message {
  background: #ffebee;
  color: #c62828;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
}

.chat-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.input-container {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  max-height: 100px;
}

.text-input:focus {
  border-color: #667eea;
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
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.voice-btn {
  background: #f5f5f5;
  color: #666;
}

.voice-btn:hover:not(:disabled) {
  background: #e0e0e0;
  transform: scale(1.05);
}

.voice-btn.recording {
  background: #ff4444;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #fff3f3;
  border-radius: 8px;
  color: #ff4444;
  font-size: 13px;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4444;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.recording-text {
  flex: 1;
}

.recording-time {
  font-weight: 600;
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
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.voice-call-btn.start-call {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.voice-call-btn.start-call:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.voice-call-btn.end-call {
  background: #ff4444;
  color: white;
}

.voice-call-btn.end-call:hover {
  background: #cc0000;
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
  background: #e8f5e9;
  border-radius: 8px;
}

.call-icon {
  font-size: 20px;
}

.call-text {
  flex: 1;
  font-weight: 600;
  color: #2e7d32;
}

.call-time {
  font-family: monospace;
  font-size: 16px;
  color: #2e7d32;
}

/* 滚动条样式 */
.chat-body::-webkit-scrollbar {
  width: 6px;
}

.chat-body::-webkit-scrollbar-track {
  background: transparent;
}

.chat-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.chat-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-window {
    left: 10px;
    right: 10px;
    width: auto;
    max-width: 400px;
  }
}
</style>
