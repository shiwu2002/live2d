<template>
  <div class="app-container">
    <!-- 聊天窗口 -->
    <ChatWindow
      v-if="showChat"
      :ws-url="wsConfig.baseUrl"
      :openid="wsConfig.openid"
      :ai-session-id="wsConfig.aiSessionId"
      :mode="wsConfig.mode"
      :visible="showChat"
      @update:visible="showChat = $event"
      @close="showChat = false"
      @animation="handleAnimation"
    />

    <!-- 语音通话窗口 -->
    <VoiceCall
      v-if="showVoiceCall"
      :visible="showVoiceCall"
      :ws-url="voiceWsUrl"
      :openid="wsConfig.openid"
      :ai-session-id="wsConfig.aiSessionId"
      @close="showVoiceCall = false"
      @animation="handleAnimation"
    />


    <!-- 用户名密码登录注册窗口 -->
    <UserAuthModal
      :visible="showUserAuthModal"
      @close="showUserAuthModal = false"
      @login-success="handleUserAuthLoginSuccess"
      @register-success="handleUserAuthRegisterSuccess"
    />

    <!-- 固定的 Live2D 小窗口 -->
    <div class="live2d-widget" v-if="discoveredModels.length > 0" :style="widgetStyle">
      <div class="widget-header" @mousedown="startWidgetDrag">
        <span class="widget-title">{{ currentModelName }}</span>
        <button class="close-btn" @click="toggleWidget" :title="isWidgetVisible ? '隐藏' : '显示'">
          {{ isWidgetVisible ? '−' : '+' }}
        </button>
      </div>
      
      <div class="widget-toolbar" v-show="isWidgetVisible">
        <div class="toolbar-buttons">
          <button 
            v-if="!isLoggedIn" 
            class="control-btn login-btn" 
            @click="toggleUserAuthModal" 
            title="账号密码登录"
          >
            <span>🔐</span>
          </button>
          <button 
            v-else 
            class="control-btn logout-btn" 
            @click="handleLogout" 
            :title="`${currentUser?.nickname || '用户'} - 退出登录`"
          >
            <span>👤</span>
          </button>
          <button class="control-btn" @click="toggleChat" title="聊天窗口">
            <span>💬</span>
          </button>
          <button class="control-btn" @click="toggleVoiceCall" title="语音通话">
            <span>🎤</span>
          </button>
          <select class="control-select" @change="handleActionSelect" v-model="selectedAction" title="动作/表情">
            <option value="">🎭</option>
            <option value="motion">🎭 随机动作</option>
            <option value="expression">😊 随机表情</option>
          </select>
          <button class="control-btn" @click="toggleWidget" title="显示/隐藏">
            <span>{{ isWidgetVisible ? '👁️' : '👁️‍🗨️' }}</span>
          </button>
          <!-- 移动端用户名显示 -->
          <div v-if="isLoggedIn && currentUser" class="mobile-user-name">
            {{ currentUser.nickname || '微信用户' }}
          </div>
        </div>
      </div>
      
      <div class="widget-body" v-show="isWidgetVisible">
        <Live2DModel
          v-if="modelPath"
          ref="live2dModelRef"
          :key="currentModel"
          :modelPath="modelPath"
          :modelId="currentModel"
          :width="widgetWidth"
          :height="widgetHeight"
        />
      </div>
      
      <div class="widget-controls" v-show="isWidgetVisible">
        <div class="model-control-group">
          <select v-model="currentModel" class="model-selector" title="Live2D 模型选择">
            <option v-for="model in discoveredModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
          
          <!-- AI 模型选择器 -->
          <div class="ai-model-selector-wrapper">
            <select
              v-model="selectedAiModel"
              class="model-selector ai-model-selector"
              @change="handleAiModelChange"
              :disabled="aiModelsLoading || isSavingPreference || !isLoggedIn"
              title="AI 模型选择（需先登录）"
            >
              <option value="" disabled>
                {{ aiModelsLoading ? '加载中...' : (isSavingPreference ? '保存中...' : (isLoggedIn ? '选择 AI 模型' : '请先登录')) }}
              </option>
              <option v-for="model in aiModels" :key="model.fullIdentifier" :value="model.fullIdentifier">
                {{ model.protocolName }} - {{ model.modelName }}{{ model.isDefault ? ' (推荐)' : '' }}
              </option>
            </select>
            <div v-if="preferenceMessage" class="preference-message" :class="preferenceMessage.type">
              {{ preferenceMessage.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
    

    <!-- 用户信息显示 -->
    <div class="user-info-panel" v-if="isLoggedIn && currentUser">
      <div class="user-avatar" v-if="currentUser.avatar">
        <img :src="currentUser.avatar" :alt="currentUser.nickname" />
      </div>
      <div class="user-details">
        <p class="user-nickname">{{ currentUser.nickname || '微信用户' }}</p>
        <p class="user-id">ID: {{ currentUser.openid.substring(0, 8) }}...</p>
      </div>
    </div>

    <!-- 加载提示 -->
    <div class="loading-tip" v-else>
      <p>正在扫描模型...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { CSSProperties } from 'vue'
import Live2DModel from './components/Live2DModel.vue'
import ChatWindow from './components/ChatWindow.vue'
import VoiceCall from './components/VoiceCall.vue'
import UserAuthModal from './components/UserAuthModal.vue'
import { autoModelConfig, getAutoModelIds } from './config/auto-models'
import { getChatConfig, generateSessionId } from './config'
import { getWebSocketUrl, logEnvConfig } from './config'
import type { UserLoginInfo, UserInfo } from './types/login'
import type { Live2DAnimationCommand } from './types/live2d'
import { authService } from './services/authService'
import { aiModelConfigService, aiModelSwitchService, type ModelConfig } from './services/aiModelConfig'

// 模型信息接口
interface ModelInfo {
  id: string
  name: string
  path: string
}

const live2dModelRef = ref<InstanceType<typeof Live2DModel> | null>(null)

// 从自动生成的配置中获取模型列表
const discoveredModels = computed<ModelInfo[]>(() => {
  const modelIds = getAutoModelIds()
  return modelIds.map(id => ({
    id,
    name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    path: autoModelConfig[id]?.path ?? ''
  }))
})

// 当前选中的模型 ID
const currentModel = ref<string>('')

// 计算当前模型路径
const modelPath = computed(() => {
  const model = discoveredModels.value.find(m => m.id === currentModel.value)
  return model ? model.path : ''
})

// 获取当前模型显示名称
const currentModelName = computed(() => {
  const model = discoveredModels.value.find(m => m.id === currentModel.value)
  return model ? model.name : '加载中...'
})

// 小窗口配置 - 固定尺寸，适合 Live2D 模型显示比例
const widgetWidth = ref(300)
const widgetHeight = ref(400)

// 小窗口显示状态
const isWidgetVisible = ref(true)
const widgetPosX = ref<number>(0)
const widgetPosY = ref<number>(0)
const widgetDragging = ref(false)
let widgetDragOffsetX = 0
let widgetDragOffsetY = 0

// 移动端断点与布局开关（小于等于768px 视为移动端）
const isMobile = ref(false)
const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const widgetStyle = computed<CSSProperties>(() => {
  if (isMobile.value) {
    // 移动端交由媒体查询与弹性布局控制，避免 inline 样式导致 position 固定
    return {
      position: 'static',
      width: '100%'
    }
  }
  // 桌面端保持可拖拽的小部件
  return {
    position: 'fixed',
    left: `${widgetPosX.value}px`,
    top: `${widgetPosY.value}px`,
    width: '320px'
  }
})

const startWidgetDrag = (e: MouseEvent) => {
  // 移动端不启用拖拽，避免与滚动/点击冲突
  if (isMobile.value) return
  widgetDragging.value = true
  widgetDragOffsetX = e.clientX - widgetPosX.value
  widgetDragOffsetY = e.clientY - widgetPosY.value
  window.addEventListener('mousemove', onWidgetDrag)
  window.addEventListener('mouseup', endWidgetDrag)
}

const onWidgetDrag = (e: MouseEvent) => {
  if (!widgetDragging.value) return
  const w = window.innerWidth
  const h = window.innerHeight
  const width = 320
  const height = 400 + 56 + 56
  widgetPosX.value = Math.min(Math.max(0, e.clientX - widgetDragOffsetX), w - width)
  widgetPosY.value = Math.min(Math.max(0, e.clientY - widgetDragOffsetY), h - Math.min(h - 20, height))
}

const endWidgetDrag = () => {
  widgetDragging.value = false
  window.removeEventListener('mousemove', onWidgetDrag)
  window.removeEventListener('mouseup', endWidgetDrag)
}

// 聊天窗口状态
const showChat = ref(false)

// 语音通话窗口状态
const showVoiceCall = ref(false)


// 用户名密码登录窗口状态
const showUserAuthModal = ref(false)

// 用户登录状态
const isLoggedIn = ref(false)
const currentUser = ref<UserLoginInfo | null>(null)

// AI 模型相关状态
const aiModels = ref<ModelConfig[]>([])
const selectedAiModel = ref<string>('')
const aiModelsLoading = ref(false)
const isSavingPreference = ref(false)
const preferenceMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null)

// 生成匿名用户ID的函数
const generateAnonymousUserId = (): string => {
  let anonymousId = localStorage.getItem('anonymousUserId')
  if (!anonymousId) {
    anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('anonymousUserId', anonymousId)
  }
  return anonymousId
}

// WebSocket 配置（从环境配置加载）
const wsConfig = ref(getChatConfig({
  baseUrl: getWebSocketUrl('chat'), // 从环境配置读取聊天服务WebSocket地址
  openid: generateAnonymousUserId(), // 默认使用匿名ID
  aiSessionId: generateSessionId()
}))

// 获取其他WebSocket服务的URL
const voiceWsUrl = getWebSocketUrl('voice')

// 监听模型变化并输出日志
watch(currentModel, (newModel, oldModel) => {
  if (newModel !== oldModel) {
    console.log(`模型切换: ${oldModel} -> ${newModel}`)
    console.log(`当前模型名称: ${currentModelName.value}`)
    console.log(`当前模型路径: ${modelPath.value}`)
  }
})

// 切换小窗口显示/隐藏
const toggleWidget = () => {
  isWidgetVisible.value = !isWidgetVisible.value
}

// 播放随机动作
const playRandomMotion = () => {
  live2dModelRef.value?.playRandomMotion()
}

// 切换表情
const changeExpression = () => {
  live2dModelRef.value?.playRandomExpression()
}

// 处理动画指令（来自 AI 消息的 animation 字段）
const handleAnimation = (command: Live2DAnimationCommand) => {
  live2dModelRef.value?.executeAnimation(command)
}

// 动作/表情下拉框选中的值
const selectedAction = ref('')

// 处理动作/表情选择
const handleActionSelect = () => {
  if (selectedAction.value === 'motion') {
    playRandomMotion()
  } else if (selectedAction.value === 'expression') {
    changeExpression()
  }
  // 执行后重置为默认选项
  selectedAction.value = ''
}

// 切换聊天窗口
const toggleChat = () => {
  showChat.value = !showChat.value
  console.log(`聊天窗口: ${showChat.value ? '打开' : '关闭'}`)
}

// 切换语音通话窗口
const toggleVoiceCall = () => {
  showVoiceCall.value = !showVoiceCall.value
  console.log(`语音通话窗口: ${showVoiceCall.value ? '打开' : '关闭'}`)
}


// 切换用户名密码登录窗口
const toggleUserAuthModal = () => {
  showUserAuthModal.value = !showUserAuthModal.value
  console.log(`用户名密码登录窗口: ${showUserAuthModal.value ? '打开' : '关闭'}`)
}



// 处理用户名密码登录成功
const handleUserAuthLoginSuccess = (userInfo: UserInfo) => {
  console.log('用户名密码登录成功:', userInfo)
  
  // 将UserInfo转换为UserLoginInfo格式以兼容现有逻辑
  const loginInfo: UserLoginInfo = {
    openid: userInfo.userId, // 使用userId作为openid
    nickname: userInfo.nickname || userInfo.username,
    avatar: userInfo.avatar || '',
    sessionId: userInfo.aiSessionId || generateSessionId()
  }
  
  isLoggedIn.value = true
  currentUser.value = loginInfo
  
  // 更新WebSocket配置
  wsConfig.value.openid = loginInfo.openid
  wsConfig.value.aiSessionId = loginInfo.sessionId
  
  // 保存登录信息到本地存储
  localStorage.setItem('userInfo', JSON.stringify(loginInfo))
  localStorage.setItem('isLoggedIn', 'true')
  localStorage.setItem('authToken', userInfo.token)
  
  console.log('登录状态已更新，sessionId:', loginInfo.sessionId)
  
  // 登录成功后加载 AI 模型列表
  loadAiModels()
}

// 处理用户注册成功
const handleUserAuthRegisterSuccess = (userInfo: UserInfo) => {
  console.log('用户注册成功:', userInfo)
  
  // 注册成功后自动登录
  handleUserAuthLoginSuccess(userInfo)
}

// 退出登录
const handleLogout = () => {
  isLoggedIn.value = false
  currentUser.value = null
  
  // 重新生成匿名ID，或者保留原ID取决于业务需求
  wsConfig.value.openid = generateAnonymousUserId()
  wsConfig.value.aiSessionId = generateSessionId()
  
  localStorage.removeItem('userInfo')
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('authToken')
  authService.logout()
  console.log('已退出登录')
}

/**
 * 加载 AI 模型列表
 */
const loadAiModels = async () => {
  if (!isLoggedIn.value || !currentUser.value) {
    aiModels.value = []
    return
  }

  aiModelsLoading.value = true
  try {
    // 使用 display API 获取模型列表，并合并健康状态
    const models = await aiModelConfigService.getDisplayModelsWithHealth()
    aiModels.value = models

    // 尝试加载用户的偏好设置
    const preference = await aiModelSwitchService.getUserPreference(currentUser.value.openid)
    if (preference && preference.hasCustomPreference) {
      // 检查偏好的模型是否在可用列表中
      const preferredModel = models.find(m => m.fullIdentifier === preference.preferredModel)
      if (preferredModel) {
        selectedAiModel.value = preference.preferredModel
        console.log('已加载用户模型偏好:', preference.preferredModel)
      } else if (models.length > 0) {
        // 如果偏好的模型不可用，使用第一个可用的
        selectDefaultModel(models)
      }
    } else if (models.length > 0) {
      // 没有偏好时，选择默认或第一个模型
      selectDefaultModel(models)
    }

    console.log('AI 模型列表加载成功:', aiModels.value.length)
  } catch (error) {
    console.error('加载 AI 模型列表失败:', error)
    showMessage('加载 AI 模型列表失败', 'error')
  } finally {
    aiModelsLoading.value = false
  }
}

/**
 * 选择默认模型
 */
const selectDefaultModel = (models: ModelConfig[]) => {
  const defaultModel = models.find(m => m.isDefault)
  if (defaultModel) {
    selectedAiModel.value = defaultModel.fullIdentifier
  } else if (models.length > 0) {
    // 按优先级排序，选择优先级最高的
    const sorted = [...models].sort((a, b) => a.priority - b.priority)
        const firstModel = sorted[0]
    if (firstModel) {
      selectedAiModel.value = firstModel.fullIdentifier
    }
  }
}

/**
 * 显示消息提示
 */
const showMessage = (text: string, type: 'success' | 'error') => {
  preferenceMessage.value = { text, type }
  setTimeout(() => {
    preferenceMessage.value = null
  }, 3000)
}

/**
 * 处理 AI 模型切换
 */
const handleAiModelChange = async () => {
  if (!selectedAiModel.value || !isLoggedIn.value || !currentUser.value) {
    return
  }

  isSavingPreference.value = true
  try {
    console.log('设置用户模型偏好:', selectedAiModel.value)
    const result = await aiModelSwitchService.setUserPreference(
      currentUser.value.openid,
      selectedAiModel.value
    )
    console.log('模型偏好设置成功:', result)
    showMessage(result.message || '模型偏好已保存', 'success')
  } catch (error: any) {
    console.error('设置模型偏好失败:', error)
    showMessage(`设置失败：${error.message || '未知错误'}`, 'error')
    // 切换失败时重新加载
    loadAiModels()
  } finally {
    isSavingPreference.value = false
  }
}

// 初始化时检查本地存储的登录状态
const checkLoginStatus = () => {
  const savedLoginStatus = localStorage.getItem('isLoggedIn')
  const savedUserInfo = localStorage.getItem('userInfo')
  
  if (savedLoginStatus === 'true' && savedUserInfo) {
    try {
      const userInfo = JSON.parse(savedUserInfo) as UserLoginInfo
      isLoggedIn.value = true
      currentUser.value = userInfo
      
      // 更新 WebSocket 配置
      wsConfig.value.openid = userInfo.openid
      wsConfig.value.aiSessionId = userInfo.sessionId // 恢复正确的 sessionId
      
      console.log('恢复登录状态 - openid:', userInfo.openid, 'sessionId:', userInfo.sessionId)
      
      // 恢复登录状态后加载 AI 模型列表
      loadAiModels()
    } catch (error) {
      console.error('解析本地登录信息失败:', error)
      handleLogout()
    }
  } else {
    // 如果未登录，确保使用匿名ID
    wsConfig.value.openid = generateAnonymousUserId()
  }
}

// 组件初始化时检查登录状态
checkLoginStatus()

// 初始化：设置默认模型
const modelIds = getAutoModelIds()
if (modelIds.length > 0) {
  currentModel.value = modelIds[0] || ''
  console.log(`已加载 ${modelIds.length} 个模型，当前模型: ${modelIds[0]}`)
}

// 输出环境配置信息（开发时便于调试）
logEnvConfig()

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)

  const w = window.innerWidth
  const h = window.innerHeight
  const width = 320
  const height = 400 + 56 + 56
  widgetPosX.value = Math.max(0, w - width - 20)
  widgetPosY.value = Math.max(0, h - Math.min(h - 20, height) - 20)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: white;
  text-align: center;
  padding: 20px;
}

.main-content h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.main-content p {
  font-size: 1.2rem;
  max-width: 600px;
  line-height: 1.6;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.model-count {
  margin-top: 1rem;
  font-size: 1rem;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 20px;
}

.loading-tip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 1.2rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

/* Live2D 固定小窗口 */
.live2d-widget {
  position: fixed;
  /* 通过 :style 控制 left/top */
  width: 320px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  overflow: hidden;
  z-index: 1000;
  transition: all 0.3s ease;
}

.live2d-widget:hover {
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.35);
  transform: translateY(-4px);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: move;
  user-select: none;
}

.widget-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.widget-toolbar {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid #e9ecef;
}

.toolbar-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.widget-body {
  width: 100%;
  height: 400px;
  background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%);
  position: relative;
  overflow: hidden;
}

.widget-controls {
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.model-control-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-model-selector-wrapper {
  position: relative;
}

.ai-model-selector {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
}

.preference-message {
  position: absolute;
  top: -35px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  animation: fadeIn 0.2s ease;
  z-index: 10;
}

.preference-message.success {
  background: #4caf50;
  color: white;
}

.preference-message.error {
  background: #f44336;
  color: white;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.ai-model-selector:hover:not(:disabled) {
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.ai-model-selector:focus {
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.ai-model-selector:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #ccc;
}

.model-selector {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #333;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.model-selector:hover {
  border-color: #667eea;
}

.model-selector:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 控制台按钮面板 */
.control-panel {
  position: fixed;
  bottom: 20px;
  right: 360px; /* 小窗口宽度320px + 间距20px + 边距20px */
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  padding: 12px;
  z-index: 999;
  transition: all 0.3s ease;
  border: 2px solid rgba(102, 126, 234, 0.2);
}

.control-panel:hover {
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.35);
  border-color: rgba(102, 126, 234, 0.4);
}

.control-buttons {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 280px;
}

.control-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.control-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.control-btn:active {
  transform: translateY(0) scale(0.98);
}

.control-btn span {
  display: block;
  line-height: 1;
}

.login-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
}

.login-btn:hover {
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

.qrcode-btn {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
}

.qrcode-btn:hover {
  box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
}

.logout-btn {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}

.logout-btn:hover {
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
}

/* 动作/表情下拉框样式 */
.control-select {
  width: 48px;
  height: 48px;
  padding: 0;
  font-size: 20px;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  outline: none;
  text-align: center;
  text-align-last: center;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.control-select:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.control-select:active {
  transform: translateY(0) scale(0.98);
}

.control-select option {
  background: white;
  color: #333;
  padding: 8px;
  font-size: 14px;
  text-align: left;
}

/* 移动端用户名显示 */
.mobile-user-name {
  display: none;
}

/* 用户信息面板 */
.user-info-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 998;
  border: 2px solid rgba(76, 175, 80, 0.2);
  transition: all 0.3s ease;
}

.user-info-panel:hover {
  box-shadow: 0 16px 64px rgba(0, 0, 0, 0.35);
  border-color: rgba(76, 175, 80, 0.4);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-nickname {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.user-id {
  margin: 0;
  font-size: 12px;
  color: #999;
  font-family: 'Courier New', monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  /* Live2D小窗口 - 全屏布局（改为纵向弹性布局，避免头部/控件遮挡画布） */
  .live2d-widget {
    width: 100vw;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    bottom: 0;
    right: 0;
    top: 0;
    left: 0;
    border-radius: 0;
    box-shadow: none;
  }
  
  .widget-header {
    position: static;
    padding: 8px 12px;
    margin: calc(env(safe-area-inset-top) + 10px) 10px 8px;
    border-radius: 12px;
    background: rgba(102, 126, 234, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1;
  }
  
  .widget-title {
    font-size: 14px;
  }
  
  .close-btn {
    width: 24px;
    height: 24px;
    font-size: 16px;
  }
  
  .widget-toolbar {
    position: static;
    margin: 8px 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: none;
  }
  
  .toolbar-buttons {
    justify-content: center;
  }
  
  .widget-body {
    width: 100%;
    height: auto;
    position: relative;
    left: 0;
    flex: 1 1 auto; /* 占据剩余空间，避免与头部/控件重叠 */
    min-height: 0;  /* 允许在弹性容器内正确收缩 */
    overflow: hidden;
  }
  
  .widget-controls {
    position: static;
    margin: 8px 10px;
    z-index: 1;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: none;
  }
  
  .model-selector {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .control-btn {
    width: 44px;
    height: 44px;
    font-size: 18px;
    border-radius: 10px;
  }
  
  /* 移动端用户名显示 - 显示在按钮旁边 */
  .mobile-user-name {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    padding: 10px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  /* 移动端隐藏独立的用户信息面板 */
  .user-info-panel {
    display: none;
  }
  
  .main-content h1 {
    font-size: 2rem;
  }
  
  .main-content p {
    font-size: 1rem;
  }
}
</style>
