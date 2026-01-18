<template>
  <div class="voice-call-container" v-if="visible">
    <div class="voice-call-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <h3>🎙️ 语音通话</h3>
        <button class="close-btn" @click="handleClose" title="关闭">✕</button>
      </div>

      <!-- 内容区域 -->
      <div class="modal-body">
        <!-- 状态显示 -->
        <div class="status-display">
          <div class="status-icon" :class="stateClass">
            <span v-if="callState === 'idle'">⏸️</span>
            <span v-else-if="callState === 'connecting'">🔄</span>
            <span v-else-if="callState === 'connected'">✅</span>
            <span v-else-if="callState === 'talking'">🎤</span>
            <span v-else-if="callState === 'listening'">👂</span>
            <span v-else-if="callState === 'error'">❌</span>
          </div>
          <div class="status-text">{{ stateText }}</div>
        </div>

        <!-- 识别文本显示 -->
        <div class="recognition-text" v-if="recognitionText">
          <div class="text-label">识别结果：</div>
          <div class="text-content">{{ recognitionText }}</div>
        </div>

        <!-- AI回复显示（v2.0.0：流式显示） -->
        <div class="ai-reply-text" v-if="aiReplyText">
          <div class="text-label">
            AI回复：
            <span class="streaming-indicator" v-if="!aiReplyFinal">▋</span>
          </div>
          <div class="text-content">{{ aiReplyText }}</div>
        </div>

        <!-- 音量控制 -->
        <div class="volume-control">
          <label>🔊 音量</label>
          <input
            type="range"
            min="0"
            max="100"
            v-model="volume"
            @input="handleVolumeChange"
            class="volume-slider"
          />
          <span class="volume-value">{{ volume }}%</span>
        </div>

        <!-- 错误提示 -->
        <div class="error-message" v-if="errorMessage">
          <span class="error-icon">⚠️</span>
          <span>{{ errorMessage }}</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="modal-footer">
        <button
          v-if="!isInCall"
          class="btn btn-primary"
          @click="handleStartCall"
          :disabled="callState === 'connecting'"
        >
          <span class="btn-icon">📞</span>
          <span>开始通话</span>
        </button>

        <template v-else>
          <button
            class="btn btn-secondary"
            @click="handleToggleRecording"
            :disabled="callState === 'connecting'"
          >
            <span class="btn-icon">{{ callState === 'talking' ? '⏸️' : '▶️' }}</span>
            <span>{{ callState === 'talking' ? '暂停' : '继续' }}</span>
          </button>

          <button
            class="btn btn-warning"
            @click="handleInterrupt"
            :disabled="callState !== 'listening'"
          >
            <span class="btn-icon">✋</span>
            <span>打断</span>
          </button>

          <button
            class="btn btn-danger"
            @click="handleEndCall"
          >
            <span class="btn-icon">📵</span>
            <span>结束通话</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { VoiceCallManager, type VoiceCallState } from '../services/voiceCallManager'

// Props
interface Props {
  visible: boolean
  wsUrl: string
  openid?: string
  aiSessionId?: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

// 状态
const callState = ref<VoiceCallState>('idle')
const recognitionText = ref('')
const aiReplyText = ref('')
const aiReplyFinal = ref(true)
const errorMessage = ref('')
const volume = ref(80)
const voiceCallManager = ref<VoiceCallManager | null>(null)

// 计算属性
const isInCall = computed(() => {
  return callState.value !== 'idle' && callState.value !== 'error'
})

const stateClass = computed(() => {
  return `state-${callState.value}`
})

const stateText = computed(() => {
  const stateMap: Record<VoiceCallState, string> = {
    idle: '未通话',
    connecting: '正在连接...',
    connected: '已连接',
    talking: '正在说话...',
    listening: 'AI正在回复...',
    error: '通话出错'
  }
  return stateMap[callState.value] || '未知状态'
})

// 初始化语音通话管理器
const initVoiceCallManager = () => {
  if (voiceCallManager.value) {
    voiceCallManager.value.destroy()
  }

  voiceCallManager.value = new VoiceCallManager({
    wsBaseUrl: props.wsUrl,
    openid: props.openid,
    aiSessionId: props.aiSessionId
  })

  // 设置初始音量
  voiceCallManager.value.setVolume(volume.value / 100)

  // 订阅状态变化
  voiceCallManager.value.onStateChange((state) => {
    callState.value = state
  })

  // 订阅错误
  voiceCallManager.value.onError((error) => {
    errorMessage.value = error.message
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  })

  // 订阅识别结果
  voiceCallManager.value.onRecognition((text) => {
    recognitionText.value = text
  })

  // 订阅AI回复（v2.0.0：流式回复）
  voiceCallManager.value.onAiReply((text, isFinal) => {
    aiReplyText.value = text
    aiReplyFinal.value = isFinal
  })
}

// 开始通话
const handleStartCall = async () => {
  try {
    errorMessage.value = ''
    recognitionText.value = ''
    aiReplyText.value = ''
    aiReplyFinal.value = true
    await voiceCallManager.value?.startCall()
  } catch (error) {
    console.error('启动通话失败:', error)
    errorMessage.value = error instanceof Error ? error.message : '启动通话失败'
  }
}

// 结束通话
const handleEndCall = () => {
  voiceCallManager.value?.endCall()
  recognitionText.value = ''
  aiReplyText.value = ''
  aiReplyFinal.value = true
}

// 切换录音状态
const handleToggleRecording = () => {
  if (callState.value === 'talking') {
    voiceCallManager.value?.pauseRecording()
  } else if (callState.value === 'listening') {
    voiceCallManager.value?.resumeRecording()
  }
}

// 打断AI回复
const handleInterrupt = () => {
  voiceCallManager.value?.interrupt()
}

// 音量变化
const handleVolumeChange = () => {
  voiceCallManager.value?.setVolume(volume.value / 100)
}

// 关闭窗口
const handleClose = () => {
  if (isInCall.value) {
    if (confirm('通话正在进行中，确定要关闭吗？')) {
      handleEndCall()
      emit('close')
    }
  } else {
    emit('close')
  }
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal && !voiceCallManager.value) {
    initVoiceCallManager()
  }
})

// 生命周期
onMounted(() => {
  if (props.visible) {
    initVoiceCallManager()
  }
})

onUnmounted(() => {
  if (voiceCallManager.value) {
    voiceCallManager.value.destroy()
    voiceCallManager.value = null
  }
})
</script>

<style scoped>
.voice-call-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.voice-call-modal {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-body {
  padding: 32px 24px;
}

.status-display {
  text-align: center;
  margin-bottom: 32px;
}

.status-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  transition: all 0.3s;
}

.status-icon.state-idle {
  background: #e0e0e0;
}

.status-icon.state-connecting {
  background: #ffd54f;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-icon.state-connected {
  background: #81c784;
}

.status-icon.state-talking {
  background: #64b5f6;
  animation: pulse 1s ease-in-out infinite;
}

.status-icon.state-listening {
  background: #ffb74d;
  animation: pulse 1s ease-in-out infinite;
}

.status-icon.state-error {
  background: #e57373;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.status-text {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.recognition-text {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.text-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.text-content {
  font-size: 16px;
  color: #333;
  line-height: 1.6;
  min-height: 24px;
}

.ai-reply-text {
  background: #e8f5e9;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border-left: 4px solid #66bb6a;
}

.ai-reply-text .text-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.streaming-indicator {
  display: inline-block;
  font-size: 16px;
  color: #66bb6a;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  50.01%, 100% {
    opacity: 0;
  }
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.volume-control label {
  font-size: 14px;
  color: #666;
  min-width: 60px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  background: linear-gradient(to right, #667eea 0%, #764ba2 100%);
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  border: none;
}

.volume-value {
  font-size: 14px;
  color: #666;
  min-width: 40px;
  text-align: right;
  font-weight: 500;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.error-icon {
  font-size: 18px;
}

.modal-footer {
  padding: 20px 24px;
  background: #f8f9fa;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 18px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #78909c;
  color: white;
}

.btn-warning {
  background: #ffa726;
  color: white;
}

.btn-danger {
  background: #ef5350;
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .voice-call-modal {
    width: 95%;
  }

  .modal-body {
    padding: 24px 16px;
  }

  .status-icon {
    width: 80px;
    height: 80px;
    font-size: 40px;
  }

  .modal-footer {
    flex-wrap: wrap;
  }

  .btn {
    min-width: 100px;
    padding: 10px 16px;
    font-size: 14px;
  }
}
</style>
