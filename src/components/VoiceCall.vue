<template>
  <Transition name="mini-slide">
    <div class="voice-mini" v-if="visible" :class="stateClass">
      <div class="mini-bar" @mousedown.stop>
        <div class="mini-left">
          <span class="mini-dot" :class="{ active: isInCall && callState !== 'error' }"></span>
          <span class="mini-timer" v-if="isInCall && callState !== 'error'">{{ callDuration }}</span>
          <span class="mini-label">{{ stateText }}</span>
        </div>

        <div class="mini-center">
          <Transition name="text-fade" mode="out-in">
            <span class="mini-text" v-if="recognitionText && callState === 'talking'" key="r">{{ recognitionText }}</span>
            <span class="mini-text ai-text" v-else-if="aiReplyText && callState === 'listening'" key="a">{{ aiReplyText }}{{ !aiReplyFinal ? '|' : '' }}</span>
            <span class="mini-hint" v-else key="h">{{ callState === 'talking' ? '正在聆听...' : callState === 'listening' ? 'AI 回复中...' : stateText }}</span>
          </Transition>
        </div>

        <div class="mini-right">
          <button class="mini-btn" v-if="isInCall" @click="handleToggleRecording" :disabled="callState === 'connecting'" :title="callState === 'talking' ? '静音' : '取消静音'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          </button>
          <button class="mini-btn" v-if="isInCall" @click="handleInterrupt" :disabled="callState === 'connecting'" title="打断">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          </button>
          <button class="mini-btn mini-end" @click="handleEndCall" title="挂断">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { VoiceCallManager, type VoiceCallState } from '../services/voiceCallManager'
import type { Live2DAnimationCommand } from '../types/live2d'

type CallState = VoiceCallState | 'ended'

interface Props {
  visible: boolean
  wsUrl: string
  openid?: string
  aiSessionId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'animation', command: Live2DAnimationCommand): void
}>()

const callState = ref<CallState>('idle')
const recognitionText = ref('')
const aiReplyText = ref('')
const aiReplyFinal = ref(true)
const errorMessage = ref('')
const volume = ref(80)
const voiceCallManager = ref<VoiceCallManager | null>(null)
const callStartTime = ref<number>(0)
const callDuration = ref('00:00')
let durationInterval: number | null = null
let endCallTimer: number | null = null

const isInCall = computed(() => {
  return callState.value !== 'idle' && callState.value !== 'error' && callState.value !== 'ended'
})

const stateClass = computed(() => `state-${callState.value}`)

const stateText = computed(() => {
  const stateMap: Record<string, string> = {
    idle: '准备中...',
    connecting: '连接中',
    connected: '已连接',
    talking: '通话中',
    listening: 'AI 回复中',
    error: '连接失败',
    ended: '已结束',
  }
  return stateMap[callState.value] || ''
})

const initVoiceCallManager = () => {
  if (voiceCallManager.value) {
    voiceCallManager.value.destroy()
  }

  voiceCallManager.value = new VoiceCallManager({
    wsBaseUrl: props.wsUrl,
    openid: props.openid,
    aiSessionId: props.aiSessionId
  })

  voiceCallManager.value.setVolume(volume.value / 100)

  voiceCallManager.value.onStateChange((state) => {
    callState.value = state
  })

  voiceCallManager.value.onError((error) => {
    errorMessage.value = error.message
    setTimeout(() => {
      errorMessage.value = ''
    }, 5000)
  })

  voiceCallManager.value.onRecognition((text) => {
    recognitionText.value = text
  })

  voiceCallManager.value.onAiReply((text, isFinal) => {
    aiReplyText.value = text
    aiReplyFinal.value = isFinal
  })

  voiceCallManager.value.onAnimation((command) => {
    emit('animation', command)
  })
}

const updateCallDuration = () => {
  if (callStartTime.value === 0) return
  const elapsed = Math.floor((Date.now() - callStartTime.value) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  callDuration.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const startDurationTimer = () => {
  callStartTime.value = Date.now()
  callDuration.value = '00:00'
  if (durationInterval) {
    clearInterval(durationInterval)
  }
  durationInterval = window.setInterval(updateCallDuration, 1000)
}

const stopDurationTimer = () => {
  if (durationInterval) {
    clearInterval(durationInterval)
    durationInterval = null
  }
}

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

const handleEndCall = () => {
  voiceCallManager.value?.endCall()
  recognitionText.value = ''
  aiReplyText.value = ''
  aiReplyFinal.value = true
  stopDurationTimer()
  callState.value = 'ended'

  if (endCallTimer) clearTimeout(endCallTimer)
  endCallTimer = window.setTimeout(() => {
    emit('close')
  }, 1000)
}

const handleToggleRecording = () => {
  if (callState.value === 'talking') {
    voiceCallManager.value?.pauseRecording()
  } else if (callState.value === 'listening') {
    voiceCallManager.value?.resumeRecording()
  }
}

const handleInterrupt = () => {
  voiceCallManager.value?.pauseTts()
}

watch(() => props.visible, (newVal) => {
  if (newVal && !voiceCallManager.value) {
    initVoiceCallManager()
    handleStartCall()
  }
})

onMounted(() => {
  if (props.visible) {
    initVoiceCallManager()
    handleStartCall()
  }
})

onUnmounted(() => {
  if (voiceCallManager.value) {
    voiceCallManager.value.destroy()
    voiceCallManager.value = null
  }
  stopDurationTimer()
  if (endCallTimer) {
    clearTimeout(endCallTimer)
    endCallTimer = null
  }
})
</script>

<style scoped>
.voice-mini {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  pointer-events: auto;
}

.mini-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(30, 30, 40, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04);
  min-width: 300px;
  max-width: min(520px, calc(100vw - 40px));
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  transition: all 0.35s ease;
}

.state-listening .mini-bar {
  background: rgba(25, 45, 30, 0.9);
  border-color: rgba(76, 175, 80, 0.15);
  box-shadow: 0 8px 32px rgba(0, 50, 20, 0.3), 0 0 0 1px rgba(76, 175, 80, 0.06);
}

.state-error .mini-bar {
  background: rgba(50, 25, 25, 0.9);
  border-color: rgba(239, 83, 80, 0.15);
}

.state-ended .mini-bar {
  opacity: 0.5;
  transform: scale(0.96);
  pointer-events: none;
}

.mini-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mini-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  flex-shrink: 0;
  transition: background 0.3s ease;
}

.mini-dot.active {
  background: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
  animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.state-connecting .mini-dot.active {
  background: #ffc107;
  box-shadow: 0 0 6px rgba(255, 193, 7, 0.5);
  animation: dotPulse 0.8s ease-in-out infinite;
}

.state-listening .mini-dot.active {
  background: #81c784;
  box-shadow: 0 0 6px rgba(129, 199, 132, 0.5);
}

.state-talking .mini-dot.active {
  background: #64b5f6;
  box-shadow: 0 0 6px rgba(100, 181, 246, 0.5);
}

.mini-timer {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
  min-width: 38px;
}

.mini-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

.mini-center {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.mini-text {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-text {
  color: rgba(165, 214, 167, 0.95);
}

.mini-hint {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
  font-style: italic;
}

.text-fade-enter-active,
.text-fade-leave-active {
  transition: all 0.2s ease;
}
.text-fade-enter-from,
.text-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.mini-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mini-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.mini-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.95);
  transform: scale(1.05);
}

.mini-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.mini-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.mini-btn svg {
  width: 17px;
  height: 17px;
}

.mini-end {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: rgba(239, 83, 80, 0.75);
  color: #fff;
}

.mini-end:hover:not(:disabled) {
  background: rgba(239, 83, 80, 0.95);
}

.mini-end svg {
  width: 18px;
  height: 18px;
}

.mini-slide-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mini-slide-leave-active {
  transition: all 0.25s ease;
}
.mini-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(24px) scale(0.92);
}
.mini-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px) scale(0.96);
}

@media (max-width: 480px) {
  .voice-mini {
    bottom: 70px;
  }

  .mini-bar {
    min-width: auto;
    width: calc(100vw - 32px);
    padding: 9px 12px;
    gap: 8px;
  }

  .mini-btn {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .mini-end {
    width: 36px;
    height: 36px;
  }

  .mini-btn svg {
    width: 16px;
    height: 16px;
  }

  .mini-text {
    font-size: 12px;
  }

  .mini-timer {
    font-size: 12px;
    min-width: 34px;
  }
}
</style>
