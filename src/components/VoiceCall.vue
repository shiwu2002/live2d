<template>
  <div class="voice-call-container" v-if="visible">
    <div class="voice-call-modal">
      <!-- 关闭按钮 -->
      <button class="close-btn-top" @click="handleClose" title="关闭">
        <span>✕</span>
      </button>

      <!-- 主内容区 -->
      <div class="call-content">
        <!-- 头像和波纹效果 -->
        <div class="avatar-section">
          <div class="avatar-container" :class="stateClass">
            <!-- 波纹动画层 -->
            <div class="ripple-effect" v-if="isInCall && callState !== 'error'">
              <div class="ripple"></div>
              <div class="ripple"></div>
              <div class="ripple"></div>
            </div>
            
            <!-- 头像 -->
            <div class="avatar-circle">
              <span class="avatar-icon">
                <span v-if="callState === 'idle' || callState === 'error'">🤖</span>
                <span v-else-if="callState === 'connecting'">📡</span>
                <span v-else-if="callState === 'talking'">🎤</span>
                <span v-else-if="callState === 'listening'">👂</span>
                <span v-else>💬</span>
              </span>
            </div>
          </div>

          <!-- 联系人名称 -->
          <div class="contact-name">AI 助手</div>
          
          <!-- 状态文本 -->
          <div class="status-text">{{ stateText }}</div>
          
          <!-- 通话时长 -->
          <div class="call-duration" v-if="isInCall && callState !== 'error'">
            {{ callDuration }}
          </div>
        </div>

        <!-- 文本信息区域（可折叠） -->
        <div class="info-section" v-if="recognitionText || aiReplyText || errorMessage">
          <!-- 识别文本 -->
          <div class="info-card recognition-card" v-if="recognitionText">
            <div class="card-label">
              <span class="label-icon">🎙️</span>
              <span>你说</span>
            </div>
            <div class="card-content">{{ recognitionText }}</div>
          </div>

          <!-- AI回复 -->
          <div class="info-card ai-card" v-if="aiReplyText">
            <div class="card-label">
              <span class="label-icon">💬</span>
              <span>AI回复</span>
              <span class="streaming-dot" v-if="!aiReplyFinal"></span>
            </div>
            <div class="card-content">{{ aiReplyText }}</div>
          </div>

          <!-- 错误信息 -->
          <div class="info-card error-card" v-if="errorMessage">
            <div class="card-label">
              <span class="label-icon">⚠️</span>
              <span>错误</span>
            </div>
            <div class="card-content">{{ errorMessage }}</div>
          </div>
        </div>

        <!-- 音量控制 -->
        <div class="volume-section" v-if="isInCall">
          <div class="volume-icon">🔊</div>
          <input
            type="range"
            min="0"
            max="100"
            v-model="volume"
            @input="handleVolumeChange"
            class="volume-slider"
          />
          <div class="volume-value">{{ volume }}</div>
        </div>
      </div>

      <!-- 底部控制按钮 -->
      <div class="call-controls">
        <!-- 未通话状态 -->
        <div class="control-row" v-if="!isInCall">
          <button
            class="control-btn control-btn-call"
            @click="handleStartCall"
            :disabled="callState === 'connecting'"
          >
            <span class="control-icon">📞</span>
          </button>
        </div>

        <!-- 通话中状态 -->
        <div class="control-row" v-else>
          <!-- 暂停/继续 -->
          <button
            class="control-btn control-btn-secondary"
            @click="handleToggleRecording"
            :disabled="callState === 'connecting'"
            :title="callState === 'talking' ? '暂停' : '继续'"
          >
            <span class="control-icon">{{ callState === 'talking' ? '⏸️' : '▶️' }}</span>
          </button>

          <!-- 打断 -->
          <button
            class="control-btn control-btn-interrupt"
            @click="handleInterrupt"
            :disabled="callState !== 'listening'"
            title="打断AI"
          >
            <span class="control-icon">✋</span>
          </button>

          <!-- 挂断 -->
          <button
            class="control-btn control-btn-end"
            @click="handleEndCall"
            title="结束通话"
          >
            <span class="control-icon">📵</span>
          </button>
        </div>
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
const callStartTime = ref<number>(0)
const callDuration = ref('00:00')
let durationInterval: number | null = null

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

// 更新通话时长
const updateCallDuration = () => {
  if (callStartTime.value === 0) return
  const elapsed = Math.floor((Date.now() - callStartTime.value) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  callDuration.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// 开始计时
const startDurationTimer = () => {
  callStartTime.value = Date.now()
  callDuration.value = '00:00'
  if (durationInterval) {
    clearInterval(durationInterval)
  }
  durationInterval = window.setInterval(updateCallDuration, 1000)
}

// 停止计时
const stopDurationTimer = () => {
  if (durationInterval) {
    clearInterval(durationInterval)
    durationInterval = null
  }
  callStartTime.value = 0
  callDuration.value = '00:00'
}

// 开始通话
const handleStartCall = async () => {
  try {
    errorMessage.value = ''
    recognitionText.value = ''
    aiReplyText.value = ''
    aiReplyFinal.value = true
    await voiceCallManager.value?.startCall()
    startDurationTimer()
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
  stopDurationTimer()
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
  stopDurationTimer()
})
</script>

<style scoped>
/* ============================================
   容器和模态框基础样式
   ============================================ */
.voice-call-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(10px);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.voice-call-modal {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 32px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 420px;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ============================================
   关闭按钮
   ============================================ */
.close-btn-top {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: #666;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn-top:hover {
  background: rgba(0, 0, 0, 0.15);
  transform: rotate(90deg) scale(1.1);
}

/* ============================================
   主内容区
   ============================================ */
.call-content {
  padding: 60px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ============================================
   头像区域
   ============================================ */
.avatar-section {
  text-align: center;
  padding: 20px 0;
}

.avatar-container {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto 24px;
}

/* 波纹效果 */
.ripple-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
}

.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(102, 126, 234, 0.4);
  animation: rippleAnimation 2s ease-out infinite;
}

.ripple:nth-child(2) {
  animation-delay: 0.7s;
}

.ripple:nth-child(3) {
  animation-delay: 1.4s;
}

@keyframes rippleAnimation {
  0% {
    width: 100%;
    height: 100%;
    opacity: 1;
  }
  100% {
    width: 180%;
    height: 180%;
    opacity: 0;
  }
}

/* 头像圆圈 */
.avatar-circle {
  position: relative;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
  transition: all 0.4s ease;
}

.avatar-icon {
  font-size: 72px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

/* 不同状态的头像样式 */
.state-idle .avatar-circle {
  background: linear-gradient(135deg, #bdbdbd 0%, #757575 100%);
}

.state-connecting .avatar-circle {
  background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%);
  animation: pulse 1.5s ease-in-out infinite;
}

.state-connected .avatar-circle {
  background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%);
}

.state-talking .avatar-circle {
  background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
  animation: pulse 1s ease-in-out infinite;
}

.state-listening .avatar-circle {
  background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
  animation: pulse 1s ease-in-out infinite;
}

.state-error .avatar-circle {
  background: linear-gradient(135deg, #e57373 0%, #ef5350 100%);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 20px 50px rgba(102, 126, 234, 0.6);
  }
}

/* 联系人名称 */
.contact-name {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

/* 状态文本 */
.status-text {
  font-size: 16px;
  color: #666;
  font-weight: 500;
  margin-bottom: 8px;
}

/* 通话时长 */
.call-duration {
  font-size: 20px;
  font-weight: 600;
  color: #667eea;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

/* ============================================
   信息卡片区域
   ============================================ */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 200px;
  overflow-y: auto;
  padding: 0 4px;
}

.info-section::-webkit-scrollbar {
  width: 4px;
}

.info-section::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 2px;
}

.info-card {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 14px 16px;
  animation: slideInCard 0.3s ease-out;
}

@keyframes slideInCard {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-icon {
  font-size: 14px;
}

.card-content {
  font-size: 15px;
  color: #1a1a1a;
  line-height: 1.6;
  word-break: break-word;
}

/* 识别卡片 */
.recognition-card {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-left: 4px solid #42a5f5;
}

/* AI回复卡片 */
.ai-card {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-left: 4px solid #66bb6a;
}

/* 流式输入指示器 */
.streaming-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #66bb6a;
  border-radius: 50%;
  margin-left: 6px;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* 错误卡片 */
.error-card {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-left: 4px solid #ef5350;
}

/* ============================================
   音量控制
   ============================================ */
.volume-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 16px;
}

.volume-icon {
  font-size: 20px;
  min-width: 24px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  background: linear-gradient(to right, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
  position: relative;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
}

.volume-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.volume-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.6);
}

.volume-value {
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
  min-width: 32px;
  text-align: right;
}

/* ============================================
   底部控制按钮
   ============================================ */
.call-controls {
  padding: 24px;
  background: rgba(102, 126, 234, 0.05);
  border-top: 1px solid rgba(102, 126, 234, 0.1);
}

.control-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.control-btn {
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.control-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.control-btn:hover::before {
  width: 100%;
  height: 100%;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
}

.control-btn:active:not(:disabled) {
  transform: translateY(-2px) scale(0.98);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.control-icon {
  font-size: 32px;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

/* 呼叫按钮 */
.control-btn-call {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  width: 80px;
  height: 80px;
}

.control-btn-call .control-icon {
  font-size: 36px;
}

/* 次要按钮 */
.control-btn-secondary {
  background: linear-gradient(135deg, #78909c 0%, #90a4ae 100%);
}

/* 打断按钮 */
.control-btn-interrupt {
  background: linear-gradient(135deg, #ffa726 0%, #ffb74d 100%);
}

/* 挂断按钮 */
.control-btn-end {
  background: linear-gradient(135deg, #ef5350 0%, #e57373 100%);
  width: 80px;
  height: 80px;
}

.control-btn-end .control-icon {
  font-size: 36px;
}

/* ============================================
   响应式设计
   ============================================ */
@media (max-width: 768px) {
  .voice-call-modal {
    width: 95%;
    max-width: 360px;
  }

  .call-content {
    padding: 50px 20px 20px;
  }

  .avatar-container {
    width: 140px;
    height: 140px;
  }

  .avatar-circle {
    width: 140px;
    height: 140px;
  }

  .avatar-icon {
    font-size: 64px;
  }

  .contact-name {
    font-size: 24px;
  }

  .control-btn {
    width: 60px;
    height: 60px;
  }

  .control-btn-call,
  .control-btn-end {
    width: 70px;
    height: 70px;
  }

  .control-icon {
    font-size: 28px;
  }

  .control-btn-call .control-icon,
  .control-btn-end .control-icon {
    font-size: 32px;
  }
}

@media (max-width: 480px) {
  .avatar-container {
    width: 120px;
    height: 120px;
  }

  .avatar-circle {
    width: 120px;
    height: 120px;
  }

  .avatar-icon {
    font-size: 56px;
  }

  .contact-name {
    font-size: 22px;
  }

  .control-row {
    gap: 16px;
  }
}
</style>
