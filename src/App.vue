<template>
  <div class="app-container desktop-pet">
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

    <VoiceCall
      v-if="showVoiceCall"
      :visible="showVoiceCall"
      :ws-url="voiceWsUrl"
      :openid="wsConfig.openid"
      :ai-session-id="wsConfig.aiSessionId"
      @close="showVoiceCall = false"
      @animation="handleAnimation"
    />

    <UserAuthModal
      :visible="showUserAuthModal"
      @close="showUserAuthModal = false"
      @login-success="handleUserAuthLoginSuccess"
      @register-success="handleUserAuthRegisterSuccess"
    />

    <CharacterSettings
      :visible="showCharacterSettings"
      :userId="currentUser?.openid || ''"
      @close="showCharacterSettings = false"
      @saved="handleCharacterSaved"
    />

    <CustomModelManager
      :visible="showCustomModelManager"
      :userId="currentUser?.openid || ''"
      @close="showCustomModelManager = false"
      @changed="handleCustomModelsChanged"
    />

    <div v-if="discoveredModels.length > 0" class="pet-container desktop-pet">
      <div class="pet-model-area desktop-pet">
        <div class="drag-handle" @mousedown="handleDragStart" title="拖拽移动窗口">
          <img src="./images/移动.png" class="drag-icon" alt="拖拽" />
        </div>
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

      <div class="pet-toolbar desktop-pet">
        <div class="toolbar-buttons">
          <button
            v-if="!isLoggedIn"
            class="control-btn login-btn"
            @click="toggleUserAuthModal"
            title="登录"
          >
            <img :src="iconLogin" alt="登录" class="btn-icon" />
          </button>
          <button
            v-else
            class="control-btn logout-btn"
            @click="handleLogout"
            :title="`${currentUser?.nickname || '用户'} - 退出登录`"
          >
            <img :src="iconLogin" alt="退出" class="btn-icon" />
          </button>
          <button class="control-btn" @click="toggleChat" title="聊天">
            <img :src="iconChat" alt="聊天" class="btn-icon" />
          </button>
          <button class="control-btn" @click="toggleVoiceCall" title="语音">
            <img :src="iconVoice" alt="语音" class="btn-icon" />
          </button>

          <div class="more-menu-wrapper">
            <button class="control-btn more-btn" @click="showMoreMenu = !showMoreMenu" title="更多">
              <img :src="iconMore" alt="更多" class="btn-icon" />
            </button>
            <div class="more-dropdown" v-show="showMoreMenu">
              <div class="dropdown-section-label">模型</div>
              <div class="dropdown-select-wrapper">
                <select v-model="currentModel" class="dropdown-select" title="Live2D 模型">
                  <option v-for="model in discoveredModels" :key="model.id" :value="model.id">
                    {{ model.name }}
                  </option>
                </select>
              </div>
              <div class="dropdown-select-wrapper">
                <select
                  v-model="selectedAiModel"
                  class="dropdown-select"
                  @change="handleAiModelChange"
                  :disabled="aiModelsLoading || isSavingPreference || !isLoggedIn"
                  title="AI 模型"
                >
                  <option value="" disabled>
                    {{ aiModelsLoading ? '加载中...' : (isSavingPreference ? '保存中...' : (isLoggedIn ? '选择 AI 模型' : '请先登录')) }}
                  </option>
                  <option v-for="model in aiModels" :key="model.fullIdentifier" :value="model.fullIdentifier">
                    {{ (model as any).isCustomModel ? '🔧 ' : '' }}{{ model.protocolName }} - {{ model.modelName }}{{ model.isDefault ? ' ★' : '' }}
                  </option>
                </select>
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-section-label">操作</div>
              <button
                class="dropdown-item"
                @click="toggleCharacterSettings(); showMoreMenu = false"
                :style="!isLoggedIn ? 'opacity:0.4' : ''"
                title="角色设置"
              >
                <img :src="iconCharacter" alt="角色设置" class="dropdown-icon" />
                <span>角色设置</span>
              </button>
              <button
                class="dropdown-item"
                @click="toggleCustomModelManager(); showMoreMenu = false"
                :style="!isLoggedIn ? 'opacity:0.4' : ''"
                title="自定义模型"
              >
                <span class="dropdown-emoji">🔧</span>
                <span>自定义模型</span>
              </button>
              <button
                class="dropdown-item"
                @click="playRandomMotion(); showMoreMenu = false"
                title="随机动作"
              >
                <span class="dropdown-emoji">🎭</span>
                <span>随机动作</span>
              </button>
              <button
                class="dropdown-item"
                @click="changeExpression(); showMoreMenu = false"
                title="随机表情"
              >
                <span class="dropdown-emoji">😊</span>
                <span>随机表情</span>
              </button>
              <div class="dropdown-divider"></div>
              <button
                class="dropdown-item"
                @click="handleMinimize(); showMoreMenu = false"
                title="最小化"
              >
                <span class="dropdown-emoji">➖</span>
                <span>最小化</span>
              </button>
              <button
                class="dropdown-item"
                @click="handleQuit(); showMoreMenu = false"
                title="退出"
              >
                <span class="dropdown-emoji">✕</span>
                <span>退出</span>
              </button>
            </div>
          </div>

          <div v-if="isLoggedIn && currentUser" class="mobile-user-name">
            {{ currentUser.nickname || '微信用户' }}
          </div>
        </div>
      </div>
    </div>

    <div class="user-info-panel" v-if="isLoggedIn && currentUser">
      <div class="user-avatar" v-if="currentUser.avatar">
        <img :src="currentUser.avatar" :alt="currentUser.nickname" />
      </div>
      <div class="user-details">
        <p class="user-nickname">{{ currentUser.nickname || '微信用户' }}</p>
        <p class="user-id">ID: {{ currentUser.openid.substring(0, 8) }}...</p>
      </div>
    </div>

    <div class="loading-tip" v-if="discoveredModels.length === 0">
      <p>正在扫描模型...</p>
    </div>

    <div v-if="preferenceMessage" class="global-toast" :class="preferenceMessage.type">
      {{ preferenceMessage.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Live2DModel from './components/Live2DModel.vue'
import ChatWindow from './components/ChatWindow.vue'
import VoiceCall from './components/VoiceCall.vue'
import UserAuthModal from './components/UserAuthModal.vue'
import CharacterSettings from './components/CharacterSettings.vue'
import CustomModelManager from './components/CustomModelManager.vue'
import { autoModelConfig, getAutoModelIds } from './config/auto-models'
import { getChatConfig, generateSessionId } from './config'
import { getWebSocketUrl, logEnvConfig } from './config'
import { getDisplayConfig } from './config/display'
import type { UserLoginInfo, UserInfo } from './types/login'
import type { Live2DAnimationCommand } from './types/live2d'
import { authService } from './services/authService'
import { aiModelConfigService, aiModelSwitchService, type ModelConfig } from './services/aiModelConfig'

import iconLogin from './images/zhanghudenglu-icon.png'
import iconChat from './images/liaotian.png'
import iconVoice from './images/a-yuyindianhuatongzhi48.png'
import iconCharacter from './images/jiaoseguanlijiaoseshezhi.png'
import iconMore from './images/gengduo.png'

const isDesktop = ref(!!(window as any).electronAPI?.isElectron)

const handleDragStart = (e: MouseEvent) => {
  console.log('handleDragStart called')
  const api = (window as any).electronAPI
  if (!api) return
  let startX = e.screenX || e.clientX
  let startY = e.screenY || e.clientY
  api.startDrag()
  const onMove = (ev: MouseEvent) => {
    api.dragMove(ev.screenX - startX, ev.screenY - startY)
  }
  const onUp = () => {
    api.endDrag()
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const handleMinimize = async () => {
  await (window as any).electronAPI?.minimizeWindow()
}

const handleQuit = async () => {
  await (window as any).electronAPI?.closeWindow()
}

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
const displayCfg = getDisplayConfig()
const widgetWidth = ref(displayCfg.widget.width)
const widgetHeight = ref(displayCfg.widget.height)

const widgetPosX = ref<number>(0)
const widgetPosY = ref<number>(0)

const isMobile = ref(false)
const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 聊天窗口状态
const showChat = ref(false)

// 语音通话窗口状态
const showVoiceCall = ref(false)


// 用户名密码登录窗口状态
const showUserAuthModal = ref(false)

// 角色设置窗口状态
const showCharacterSettings = ref(false)

// 自定义模型管理窗口状态
const showCustomModelManager = ref(false)

// 更多菜单下拉状态
const showMoreMenu = ref(false)

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

const playRandomMotion = () => {
  live2dModelRef.value?.playRandomMotion()
}

// 切换表情
const changeExpression = () => {
  live2dModelRef.value?.playRandomExpression()
}

const handleAnimation = (command: Live2DAnimationCommand) => {
  live2dModelRef.value?.executeAnimation(command)
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

// 切换角色设置窗口
const toggleCharacterSettings = () => {
  if (!isLoggedIn.value) {
    showMessage('请先登录', 'error')
    return
  }
  showCharacterSettings.value = !showCharacterSettings.value
}

// 角色保存成功回调
const handleCharacterSaved = (character: any) => {
  console.log('角色设置已保存:', character)
  showMessage('角色设置已保存', 'success')
}

// 切换自定义模型管理窗口
const toggleCustomModelManager = () => {
  if (!isLoggedIn.value) {
    showMessage('请先登录', 'error')
    return
  }
  showCustomModelManager.value = !showCustomModelManager.value
}

// 自定义模型变更回调
const handleCustomModelsChanged = () => {
  loadAiModels()
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
    // 使用 display-with-custom API 获取模型列表（含用户自定义模型）
    const models = await aiModelConfigService.getDisplayModelsWithCustom(currentUser.value.openid)
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

onMounted(async () => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)

  document.addEventListener('click', handleClickOutside)

  const w = window.innerWidth
  const h = window.innerHeight
  const width = displayCfg.widget.width
  const height = displayCfg.widget.height + 56 + 56
  widgetPosX.value = Math.max(0, w - width - 20)
  widgetPosY.value = Math.max(0, h - Math.min(h - 20, height) - 20)

  console.log('onMounted desktop check, isDesktop:', isDesktop.value)

  if (isDesktop.value) {
    try {
      const { width: cfgW, height: cfgH } = displayCfg.window
      await (window as any).electronAPI?.setWindowSize(cfgW, cfgH)
      console.log(`✅ 窗口大小已设置为 ${cfgW}x${cfgH}`)
    } catch (e) {
      console.warn('⚠️ 设置窗口大小失败:', e)
    }
  }

  ;(async () => {
    console.log('=== STARTING TRANSPARENCY SETUP ===')

    const style = document.createElement('style')
    style.id = 'force-transparent-styles'
    style.textContent = `
      html, body, #app,
      .app-container, .pet-container, .pet-model-area,
      .live2d-container, canvas,
      .app-container.desktop-pet,
      .pet-container.desktop-pet,
      .pet-model-area.desktop-pet {
        background: transparent !important;
        background-color: #00000000 !important;
        background-image: none !important;
        backdrop-filter: none !important;
      }

      /* 确保所有可能的背景元素都透明 */
      .desktop-pet {
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
        border: none !important;
      }
    `
    document.head.appendChild(style)
    console.log('✅ Injected force-transparent styles')
    console.log('✅ Electron mode - transparency handled by BrowserWindow config')
    console.log('=== TRANSPARENCY SETUP DONE ===')
  })()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
  document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.more-menu-wrapper')) {
    showMoreMenu.value = false
  }
}
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%);
}

.app-container.desktop-pet {
  min-height: 100vh;
  background: transparent !important;
}

.loading-tip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #C44569;
  font-size: 1.2rem;
}

.pet-container {
  position: fixed;
  width: 320px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(255, 107, 157, 0.2);
  backdrop-filter: blur(10px);
  overflow: visible;
  z-index: 1000;
  transition: all 0.3s ease;
  border: 1.5px solid rgba(255, 107, 157, 0.15);
}

.pet-container:hover {
  box-shadow: 0 16px 64px rgba(255, 107, 157, 0.3);
}

.pet-container.desktop-pet {
  background: transparent !important;
  border: none;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  overflow: visible;
  width: auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.pet-container.desktop-pet:hover {
  box-shadow: none;
}

.pet-model-area {
  width: 100%;
  height: 400px;
  background: linear-gradient(180deg, #FFF5F9 0%, #ffffff 100%);
  position: relative;
  overflow: hidden;
  border-radius: 20px 20px 0 0;
}

.pet-model-area.desktop-pet {
  flex: 1;
  width: 100vw;
  height: auto;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  cursor: default;
}

.pet-model-area.desktop-pet:active {
  cursor: grabbing;
}

.drag-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: grab;
  border-radius: 50%;
  background: transparent;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;
}

.drag-handle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drag-handle:hover::before {
  opacity: 1;
  transform: scale(1);
}

.drag-icon {
  width: 36px;
  height: 36px;
  display: block;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.25s ease 0.05s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s;
  position: relative;
  z-index: 1;
}

.drag-handle:hover .drag-icon {
  opacity: 1;
  transform: scale(1);
}

.pet-toolbar {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #FFE0EB;
}

.pet-toolbar.desktop-pet {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid rgba(255, 107, 157, 0.15);
  padding: 8px 12px;
  box-shadow: 0 8px 32px rgba(255, 107, 157, 0.15);
  z-index: 1001;
  opacity: 0.3;
  transition: opacity 0.3s ease;
  -webkit-app-region: no-drag;
}

.pet-toolbar.desktop-pet * {
  -webkit-app-region: no-drag;
}

.pet-toolbar.desktop-pet:hover {
  opacity: 1;
}

.toolbar-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.pet-toolbar.desktop-pet .toolbar-buttons {
  flex-wrap: nowrap;
  gap: 8px;
}

.control-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  border-radius: 14px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3);
}

.control-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.4);
}

.control-btn:active {
  transform: translateY(0) scale(0.98);
}

.pet-toolbar.desktop-pet .control-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.2);
}

.btn-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  pointer-events: none;
  filter: brightness(0) invert(1);
}

.pet-toolbar.desktop-pet .btn-icon {
  width: 20px;
  height: 20px;
}

.login-btn {
  background: linear-gradient(135deg, #FF8A9E 0%, #FF6B9D 100%);
}

.logout-btn {
  background: linear-gradient(135deg, #E84393 0%, #C44569 100%);
}

.more-menu-wrapper {
  position: relative;
}

.more-btn {
  background: linear-gradient(135deg, #FDA7DF 0%, #FF8A9E 100%);
}

.more-dropdown {
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(255, 107, 157, 0.2);
  backdrop-filter: blur(10px);
  min-width: 200px;
  z-index: 1002;
  overflow: hidden;
  animation: dropdownFadeIn 0.15s ease;
  border: 1px solid #FFE0EB;
  padding: 6px 0;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-section-label {
  padding: 6px 14px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #FF8A9E;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.dropdown-select-wrapper {
  padding: 2px 10px;
}

.dropdown-select {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  color: #333;
  background: #FFF5F9;
  border: 1.5px solid #FFD0E0;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.dropdown-select:hover {
  border-color: #FF6B9D;
}

.dropdown-select:focus {
  border-color: #FF6B9D;
  box-shadow: 0 0 0 2px rgba(255, 107, 157, 0.1);
}

.dropdown-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown-divider {
  height: 1px;
  background: #FFE0EB;
  margin: 4px 10px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: rgba(255, 107, 157, 0.08);
  color: #C44569;
}

.dropdown-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.dropdown-emoji {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.mobile-user-name {
  display: none;
}

.user-info-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(255, 107, 157, 0.2);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 998;
  border: 2px solid rgba(255, 107, 157, 0.15);
  transition: all 0.3s ease;
}

.user-info-panel:hover {
  box-shadow: 0 16px 64px rgba(255, 107, 157, 0.3);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
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
  color: #C44569;
}

.user-id {
  margin: 0;
  font-size: 12px;
  color: #FF8A9E;
  font-family: 'Courier New', monospace;
}

.global-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  animation: toastFadeIn 0.3s ease;
  backdrop-filter: blur(10px);
}

.global-toast.success {
  background: rgba(255, 138, 158, 0.95);
  color: white;
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.3);
}

.global-toast.error {
  background: rgba(244, 67, 54, 0.95);
  color: white;
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.3);
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 768px) {
  .pet-container {
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

  .pet-model-area {
    width: 100%;
    height: auto;
    position: relative;
    left: 0;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }

  .pet-toolbar {
    position: static;
    margin: 8px 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 14px;
    border: none;
  }

  .toolbar-buttons {
    justify-content: center;
  }

  .control-btn {
    width: 44px;
    height: 44px;
    font-size: 18px;
    border-radius: 12px;
  }

  .btn-icon {
    width: 22px;
    height: 22px;
  }

  .mobile-user-name {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    padding: 10px 12px;
    background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
    color: white;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 4px 12px rgba(255, 107, 157, 0.3);
  }

  .user-info-panel {
    display: none;
  }
}
</style>
