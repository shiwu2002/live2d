<template>
  <div class="app-container desktop-pet" :class="{ 'native-app': isMobileApp }">
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
      @auth-failed="handleWsAuthFailed"
      ref="chatWindowRef"
    />

    <VoiceCall
      v-if="showVoiceCall"
      :visible="showVoiceCall"
      :ws-url="voiceWsUrl"
      :openid="wsConfig.openid"
      :ai-session-id="wsConfig.aiSessionId"
      @close="showVoiceCall = false"
      @animation="handleAnimation"
      @auth-failed="handleWsAuthFailed"
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

    <MemoryUpload
      :visible="showMemoryUpload"
      :userId="currentUser?.openid || ''"
      :ai-session-id="wsConfig.aiSessionId"
      @close="showMemoryUpload = false"
    />

    <VoiceModelSettings
      :visible="showVoiceModelSettings"
      :userId="currentUser?.openid || ''"
      @close="showVoiceModelSettings = false"
      @changed="handleVoiceModelsChanged"
    />

    <Live2DModelManager
      :visible="showLive2DModelManager"
      @close="showLive2DModelManager = false"
      @changed="handleLive2DModelsChanged"
    />

    <!-- 独立日记面板（使用 Teleport 避免层级遮挡） -->
    <Teleport to="body">
      <div v-if="showDiaryPanel && isLoggedIn" class="diary-modal-overlay" @click="showDiaryPanel = false">
        <div class="diary-modal" @click.stop>
          <div class="diary-header">
            <span class="diary-title">📖 龙宝的日记</span>
            <button class="diary-close-btn" @click="showDiaryPanel = false">✕</button>
          </div>
          <div class="diary-body" ref="appDiaryBody">
            <div v-if="isLoadingAppDiary" class="diary-loading">加载日记中...</div>
            <div v-else-if="appDiaryList.length === 0" class="diary-empty">
              <div class="empty-icon">📖</div>
              <div class="empty-text">暂无日记</div>
              <div class="empty-hint">龙宝还没有写日记哦~</div>
            </div>
            <div v-else class="diary-list">
              <div
                v-for="diary in appDiaryList"
                :key="diary.id"
                class="diary-item"
              >
                <div class="diary-date">{{ formatAppDiaryDate(diary.createTime) }}</div>
                <div class="diary-content-text">{{ diary.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="discoveredModels.length > 0" class="pet-container desktop-pet">
      <div class="background-board" :class="{ 'hidden': !showBackground }">
        <div class="drag-handle-top-right" @mousedown="handleDragStart" title="拖拽移动窗口">
          <img src="./images/移动.png" class="drag-icon" alt="拖拽" />
        </div>
      </div>
      <div class="pet-model-area desktop-pet">
        <Live2DModel
          v-if="modelPath"
          ref="live2dModelRef"
          :key="currentModel"
          :modelPath="modelPath"
          :modelId="currentModel"
          :width="widgetWidth"
          :height="widgetHeight"
          @loaded="handleLive2DModelLoaded"
          @error="handleLive2DModelError"
        />

        <!-- 竖状好感度条（模型右上方） -->
        <div
          class="relationship-bar-vertical desktop-pet"
          @click="handleShowRelationshipDetail"
          :title="notifRelationshipData ? `${notifRelationshipLevel.name} ${notifRelationshipData.favorability}/100` : '登录后显示好感度'"
        >
          <div class="rv-icon">{{ notifRelationshipLevel.icon }}</div>
          <div class="rv-track">
            <div
              class="rv-fill"
              :style="{
                height: `${notifRelationshipData?.favorability ?? 0}%`,
                backgroundColor: notifRelationshipLevel.color
              }"
            ></div>
            <div class="rv-glow" :style="{ backgroundColor: notifRelationshipLevel.color }"></div>
          </div>
          <div class="rv-label" :style="{ color: notifRelationshipLevel.color }">
            {{ notifRelationshipData?.favorability ?? '-' }}
          </div>
        </div>
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
          <button
            class="control-btn background-btn"
            :class="{ 'active': showBackground }"
            @click="toggleBackground"
            :title="showBackground ? '隐藏背景板' : '显示背景板'"
          >
            <span class="background-icon">🎨</span>
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
              <div class="dropdown-section-label">账户</div>
              <div v-if="isLoggedIn && currentUser" class="dropdown-user-info">
                <img v-if="currentUser.avatar" :src="currentUser.avatar" class="dropdown-avatar" alt="" />
                <span class="dropdown-username">{{ currentUser.nickname || '微信用户' }}</span>
                <span class="dropdown-user-id">{{ currentUser.openid.substring(0, 8) }}...</span>
              </div>
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
                <span>自定义LLM模型</span>
              </button>
              <button
                class="dropdown-item"
                @click="toggleVoiceModelSettings(); showMoreMenu = false"
                :style="!isLoggedIn ? 'opacity:0.4' : ''"
                title="语音模型设置"
              >
                <span class="dropdown-emoji">🎙️</span>
                <span>自定义语音模型</span>
              </button>
              <button
                class="dropdown-item"
                @click="toggleLive2DModelManager(); showMoreMenu = false"
                :style="!isLoggedIn ? 'opacity:0.4' : ''"
                title="Live2D 模型管理"
              >
                <span class="dropdown-emoji">🎭</span>
                <span>Live2D 模型管理</span>
              </button>
              <button
                class="dropdown-item"
                @click="toggleMemoryUpload(); showMoreMenu = false"
                :style="!isLoggedIn ? 'opacity:0.4' : ''"
                title="对话记忆"
              >
                <span class="dropdown-emoji">📝</span>
                <span>外部记忆导入</span>
              </button>
              <button
                v-if="isLoggedIn"
                class="dropdown-item"
                @click="handleToggleDiary(); showMoreMenu = false"
                title="查看日记"
              >
                <span class="dropdown-emoji">📖</span>
                <span>日记</span>
                <span v-if="chatUnreadDiaryCount > 0" class="diary-badge-inline">{{ chatUnreadDiaryCount > 99 ? '99+' : chatUnreadDiaryCount }}</span>
              </button>
              <div class="dropdown-divider"></div>

              <div class="dropdown-section-label">自动播放</div>
              <button
                class="dropdown-item"
                :class="{ 'active': autoPlayMotion }"
                @click="toggleAutoPlayMotion(!autoPlayMotion)"
                title="自动播放动作"
              >
                <span class="dropdown-emoji">🎬</span>
                <span>自动播放动作</span>
                <span class="toggle-indicator">{{ autoPlayMotion ? '✓' : '' }}</span>
              </button>
              <button
                class="dropdown-item"
                :class="{ 'active': autoPlayExpression }"
                @click="toggleAutoPlayExpression(!autoPlayExpression)"
                title="自动播放表情"
              >
                <span class="dropdown-emoji">😄</span>
                <span>自动播放表情</span>
                <span class="toggle-indicator">{{ autoPlayExpression ? '✓' : '' }}</span>
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
        </div>
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Live2DModel from './components/Live2DModel.vue'
import ChatWindow from './components/ChatWindow.vue'
import VoiceCall from './components/VoiceCall.vue'
import UserAuthModal from './components/UserAuthModal.vue'
import CharacterSettings from './components/CharacterSettings.vue'
import CustomModelManager from './components/CustomModelManager.vue'
import MemoryUpload from './components/MemoryUpload.vue'
import VoiceModelSettings from './components/VoiceModelSettings.vue'
import Live2DModelManager from './components/Live2DModelManager.vue'
import { autoModelConfig, getValidAutoModelIds } from './config/auto-models'
import { live2dModelService, type Live2DModelInfo } from './services/live2dModelService'
import { getChatConfig, generateSessionId, getEnvConfig } from './config'
import { getWebSocketUrl } from './config'
import { getDisplayConfig } from './config/display'
import type { UserLoginInfo, UserInfo } from './types/login'
import type { Live2DAnimationCommand } from './types/live2d'
import { authService } from './services/authService'
import { setUnauthorizedHandler } from './services/httpClient'
import { aiModelConfigService, aiModelSwitchService, type ModelConfig } from './services/aiModelConfig'
import { isNativeApp } from './utils/capacitor'
import { getUserEngagementService, getFavorabilityLevel } from './services/userEngagement'
import { notificationWs, type NotificationRelationshipData } from './services/notificationWebSocket'

import iconLogin from './images/zhanghudenglu-icon.png'
import iconChat from './images/liaotian.png'
import iconVoice from './images/a-yuyindianhuatongzhi48.png'
import iconCharacter from './images/jiaoseguanlijiaoseshezhi.png'
import iconMore from './images/gengduo.png'

const isDesktop = ref(!!(window as any).electronAPI?.isElectron)
const isMobileApp = ref(isNativeApp())

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
  isValid?: boolean  // 文件验证状态
}

const live2dModelRef = ref<InstanceType<typeof Live2DModel> | null>(null)
const chatWindowRef = ref<InstanceType<typeof ChatWindow> | null>(null)

const remoteModels = ref<Live2DModelInfo[]>([])

// 转换模型 URL（处理开发环境的 CORS 问题）
const normalizeModelUrl = (modelUrl: string): string => {
  if (!modelUrl) return ''

  const config = getEnvConfig()

  // 开发环境下，将完整的后端 URL 转换为相对路径
  // 例如：https://shiwu.shop/model/hiyori/xxx.model3.json → /model/hiyori/xxx.model3.json
  if (config.env === 'development' && config.apiBaseUrl === '') {
    // 尝试移除常见的生产环境 base URL 前缀
    const productionHosts = [
      'https://shiwu.shop',
      'http://localhost:8080',
      'https://localhost:8080'
    ]

    for (const host of productionHosts) {
      if (modelUrl.startsWith(host)) {
        const relativePath = modelUrl.substring(host.length)
        console.log(`[App] 转换模型URL（开发环境）: ${modelUrl} → ${relativePath}`)
        return relativePath
      }
    }

    // 如果不匹配任何已知主机，尝试提取路径部分
    try {
      const url = new URL(modelUrl)
      console.log(`[App] 使用 URL 路径: ${modelUrl} → ${url.pathname}`)
      return url.pathname
    } catch {
      // 如果不是有效 URL，原样返回
      return modelUrl
    }
  }

  // 生产环境或其他情况，原样返回
  return modelUrl
}

const discoveredModels = computed<ModelInfo[]>(() => {
  if (remoteModels.value.length > 0) {
    return remoteModels.value.map(m => ({
      id: m.id,
      name: m.name,
      path: normalizeModelUrl(m.modelUrl),  // 使用转换后的路径
      isValid: true
    }))
  }
  const validModelIds = getValidAutoModelIds()
  return validModelIds.map(id => {
    const config = autoModelConfig[id]
    return {
      id,
      name: config?.name || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      path: config?.path ?? '',
      isValid: config?.exists ?? false
    }
  })
})

// 当前选中的模型 ID
const currentModel = ref<string>('')

// 计算当前模型路径（现在路径已包含正确的 base 前缀）
const modelPath = computed(() => {
  const model = discoveredModels.value.find(m => m.id === currentModel.value)
  return model?.isValid ? model.path : ''
})

// 模型加载错误状态
const modelLoadError = ref<string>('')

// 验证并设置默认模型（选择第一个有效模型，或指定模型）
const initializeDefaultModel = (preferredModelId?: string) => {
  const models = discoveredModels.value
  const validModels = models.filter(m => m.isValid)

  if (validModels.length > 0) {
    // 如果指定了首选模型ID，且该模型有效，则使用它
    if (preferredModelId && validModels.find(m => m.id === preferredModelId)) {
      currentModel.value = preferredModelId
      return
    }

    if (currentModel.value && validModels.find(m => m.id === currentModel.value)) {
      return
    }

    currentModel.value = validModels[0]!.id
  } else {
    console.warn('⚠️  未找到有效的 Live2D 模型')
    modelLoadError.value = '未找到可用的模型文件'
  }
}

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

// 记忆上传窗口状态
const showMemoryUpload = ref(false)

// 语音模型设置窗口状态
const showVoiceModelSettings = ref(false)

// Live2D 模型管理窗口状态
const showLive2DModelManager = ref(false)

// 独立日记面板状态
const showDiaryPanel = ref(false)
const appDiaryList = ref<any[]>([])
const isLoadingAppDiary = ref(false)
const appDiaryBody = ref<HTMLElement | null>(null)

// 更多菜单下拉状态
const showMoreMenu = ref(false)

// 背景板显示状态
const showBackground = ref(true)
const isBackgroundHidden = ref(false)

// 自动播放状态
const autoPlayMotion = ref(false)
const autoPlayExpression = ref(false)
let autoMotionInterval: ReturnType<typeof setInterval> | null = null
let autoExpressionInterval: ReturnType<typeof setInterval> | null = null

// 启动/停止自动播放动作
const toggleAutoPlayMotion = (enabled: boolean) => {
  autoPlayMotion.value = enabled
  if (autoMotionInterval) {
    clearInterval(autoMotionInterval)
    autoMotionInterval = null
  }
  if (enabled) {
    autoMotionInterval = setInterval(() => {
      playRandomMotion()
    }, 5000)
    console.log('✅ 自动播放动作已开启')
  } else {
    console.log('⏹️ 自动播放动作已关闭')
  }
}

// 启动/停止自动播放表情
const toggleAutoPlayExpression = (enabled: boolean) => {
  autoPlayExpression.value = enabled
  if (autoExpressionInterval) {
    clearInterval(autoExpressionInterval)
    autoExpressionInterval = null
  }
  if (enabled) {
    autoExpressionInterval = setInterval(() => {
      changeExpression()
    }, 7000)
    console.log('✅ 自动播放表情已开启')
  } else {
    console.log('⏹️ 自动播放表情已关闭')
  }
}

// 鼠标穿透：状态缓存 + 启用防抖（禁用立即生效，启用延迟 250ms）
let mousePenetrationListener: ((e: MouseEvent) => void) | null = null
let lastIgnoreState: boolean | null = null
let enableIgnoreTimer: ReturnType<typeof setTimeout> | null = null
const ENABLE_IGNORE_DELAY_MS = 250

// 检查是否有任何交互界面正在显示
const hasActiveInteractiveUI = () => {
  return (
    showChat.value ||
    showVoiceCall.value ||
    showUserAuthModal.value ||
    showCharacterSettings.value ||
    showCustomModelManager.value ||
    showMemoryUpload.value ||
    showVoiceModelSettings.value ||
    showLive2DModelManager.value ||
    showMoreMenu.value ||
    showDiaryPanel.value
  )
}

const getApi = () => (window as any).electronAPI

// 清除启用穿透的防抖定时器
const clearEnableIgnoreTimer = () => {
  if (enableIgnoreTimer) {
    clearTimeout(enableIgnoreTimer)
    enableIgnoreTimer = null
  }
}

// 仅当穿透状态需改变时才调用（fire-and-forget）
const applyMouseIgnore = (ignore: boolean) => {
  if (ignore === lastIgnoreState) return
  lastIgnoreState = ignore
  getApi()?.setIgnoreMouseEvents?.(ignore, { forward: true })
}

// 根据鼠标 Y 坐标判断是否在工具栏区域（不穿透），底部 140px
const isInToolbarZone = (y: number) => y > window.innerHeight - 140

const syncMouseIgnore = (clientY: number) => {
  const inToolbar = isInToolbarZone(clientY)
  const hasUI = hasActiveInteractiveUI()

  if (inToolbar || hasUI) {
    // 进入工具栏区域 / 有 UI 打开 → 立即禁用穿透
    clearEnableIgnoreTimer()
    applyMouseIgnore(false)
  } else {
    // 离开工具栏区域且无 UI → 延迟启用穿透（防止从模型区快速滑向工具栏时误穿透）
    if (!enableIgnoreTimer) {
      enableIgnoreTimer = setTimeout(() => {
        enableIgnoreTimer = null
        // 再次确认鼠标仍在模型区域且无 UI
        if (!hasActiveInteractiveUI()) {
          applyMouseIgnore(true)
        }
      }, ENABLE_IGNORE_DELAY_MS)
    }
  }
}

// 切换背景板显示
const toggleBackground = async () => {
  showBackground.value = !showBackground.value
  isBackgroundHidden.value = !showBackground.value
  console.log(`背景板: ${showBackground.value ? '显示' : '隐藏'}`)

  if (isDesktop.value) {
    const api = getApi()
    if (isBackgroundHidden.value) {
      // 背景隐藏：启动 mousemove 快速路径 + 主进程轮询安全网
      if (!mousePenetrationListener) {
        mousePenetrationListener = (e: MouseEvent) => syncMouseIgnore(e.clientY)
        document.addEventListener('mousemove', mousePenetrationListener)
      }
      // 通知主进程启动轮询（安全网：不依赖渲染进程事件/焦点）
      api?.setBackgroundHidden?.(true)
      // 刚点击按钮，鼠标在工具栏区域 → 不穿透
      applyMouseIgnore(false)
    } else {
      // 背景显示：停止主进程轮询，移除快速路径监听，关闭穿透
      api?.setBackgroundHidden?.(false)
      clearEnableIgnoreTimer()
      if (mousePenetrationListener) {
        document.removeEventListener('mousemove', mousePenetrationListener)
        mousePenetrationListener = null
      }
      lastIgnoreState = null
      applyMouseIgnore(false)
    }
  }
}

// 焦点管理：使用主进程 BrowserWindow blur/focus（快速恢复）
// 失焦时（用户点击穿透到桌面）→ 立即关闭穿透
// 主进程轮询作为安全网：即使此事件未触发，也会在 100ms 内修正穿透状态
const onMainWindowBlurred = () => {
  if (!isDesktop.value || !isBackgroundHidden.value) return
  lastIgnoreState = null
  applyMouseIgnore(false)
}

const onMainWindowFocused = () => {
  if (!isDesktop.value || !isBackgroundHidden.value) return
  if (hasActiveInteractiveUI()) {
    applyMouseIgnore(false)
    return
  }
  // 没有 UI 且背景隐藏：等 mousemove 同步正确穿透状态
  // 不急于启用穿透，避免刚拿回焦点时误穿透
}

// 监听交互界面状态变化
watch(
  [showChat, showVoiceCall, showUserAuthModal, showCharacterSettings, showCustomModelManager, showMemoryUpload, showVoiceModelSettings, showLive2DModelManager, showMoreMenu, showDiaryPanel],
  () => {
    if (!isDesktop.value) return
    const hasUI = hasActiveInteractiveUI()
    // 通知主进程交互界面状态（让主进程轮询也考虑此状态）
    getApi()?.setInteractiveUIActive?.(hasUI)
    if (hasUI) {
      applyMouseIgnore(false)
      console.log('交互界面打开，已禁用穿透')
    } else if (isBackgroundHidden.value && !mousePenetrationListener) {
      // UI 全关且背景隐藏但没有监听 → 异常状态，启用穿透
      applyMouseIgnore(true)
    }
    // 正常情况：UI 全关且背景隐藏 → mousemove 监听器会同步正确状态
  }
)

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
  if (!requireAuth()) return
  showChat.value = !showChat.value
  console.log(`聊天窗口: ${showChat.value ? '打开' : '关闭'}`)
}

// 切换语音通话窗口
const toggleVoiceCall = () => {
  if (!requireAuth()) return
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
  if (!requireAuth()) return
  showCharacterSettings.value = !showCharacterSettings.value
}

// 角色保存成功回调
const handleCharacterSaved = (character: any) => {
  console.log('角色设置已保存:', character)
  showMessage('角色设置已保存', 'success')
}

// 切换自定义模型管理窗口
const toggleCustomModelManager = () => {
  if (!requireAuth()) return
  showCustomModelManager.value = !showCustomModelManager.value
}

// 切换记忆上传窗口
const toggleMemoryUpload = () => {
  if (!requireAuth()) return
  showMemoryUpload.value = !showMemoryUpload.value
}

// 切换语音模型设置窗口
const toggleVoiceModelSettings = () => {
  if (!requireAuth()) return
  showVoiceModelSettings.value = !showVoiceModelSettings.value
}

// 切换 Live2D 模型管理窗口
const toggleLive2DModelManager = () => {
  if (!requireAuth()) return
  showLive2DModelManager.value = !showLive2DModelManager.value
}

// Live2D 模型变更回调
const handleLive2DModelsChanged = async () => {
  await loadRemoteModels()
}

/**
 * 加载远程 Live2D 模型列表（统一封装，支持用户隔离）
 */
const loadRemoteModels = async () => {
  try {
    const models = await live2dModelService.list()
    const oldModelCount = remoteModels.value.length
    remoteModels.value = models

    // 如果模型数量变化，重新初始化默认模型
    if (models.length > 0) {
      initializeDefaultModel()
    }

    console.log(`[App] 远程 Live2D 模型列表已加载: ${models.length} 个模型`)
  } catch (error) {
    console.error('[App] 加载远程 Live2D 模型列表失败:', error)
    remoteModels.value = []
  }
}

// Live2D 模型加载成功回调
const handleLive2DModelLoaded = () => {
  modelLoadError.value = ''
}

// Live2D 模型加载失败回调
const handleLive2DModelError = (error: Error) => {
  console.error('❌ [App] Live2D 模型加载失败:', error.message)
  modelLoadError.value = `模型加载失败: ${error.message}`
}

// 好感度数据：从通知 WebSocket 实时获取（不再依赖 ChatWindow ref）
const notifRelationshipData = computed<NotificationRelationshipData | null>(() => {
  return notificationWs.relationship.value
})

const notifRelationshipLevel = computed(() => {
  if (!notifRelationshipData.value) {
    return { name: '陌生', color: '#9ca3af', icon: '🤍', stars: 1 }
  }
  return getFavorabilityLevel(notifRelationshipData.value.favorability)
})

const handleShowRelationshipDetail = () => {
  chatWindowRef.value?.showRelationshipDetail()
}

const chatUnreadDiaryCount = computed(() => {
  const raw = (chatWindowRef.value as any)?.unreadDiaryCount
  if (!raw) return 0
  if (typeof raw === 'number') return raw
  return raw?.value ?? 0
})

const handleToggleDiary = () => {
  // 未登录时禁止查看日记
  if (!isLoggedIn.value) {
    console.log('[App] 未登录，无法查看日记')
    showUserAuthModal.value = true  // 弹出登录框
    return
  }

  showDiaryPanel.value = !showDiaryPanel.value

  if (showDiaryPanel.value && appDiaryList.value.length === 0) {
    loadAppDiaryList()
  }
}

const loadAppDiaryList = async () => {
  // 未登录时禁止加载日记
  if (!isLoggedIn.value) {
    console.log('[App] 未登录，无法加载日记列表')
    return
  }

  isLoadingAppDiary.value = true
  try {
    const engagementService = getUserEngagementService()
    const diaries = await engagementService.getDiaryList(20)
    appDiaryList.value = diaries

    nextTick(() => {
      if (appDiaryBody.value) {
        appDiaryBody.value.scrollTop = 0
      }
    })
  } catch (error) {
    console.error('加载日记列表失败:', error)
  } finally {
    isLoadingAppDiary.value = false
  }
}

const formatAppDiaryDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `📖 ${year}-${month}-${day}`
  } catch {
    return '📖 未知日期'
  }
}

// 自定义模型变更回调
const handleCustomModelsChanged = () => {
  loadAiModels()
}

// 语音模型变更回调
const handleVoiceModelsChanged = () => {
  console.log('语音模型配置已更新')
}

/**
 * 处理 WebSocket 认证失败（Token 过期/无效）
 */
const handleWsAuthFailed = () => {
  console.warn('[App] WebSocket 认证失败，Token 已过期或无效，需要重新登录')

  if (isLoggedIn.value) {
    handleLogout()
  }

  showUserAuthModal.value = true
}



// 处理用户名密码登录成功
const handleUserAuthLoginSuccess = async (userInfo: UserInfo) => {
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

  // 重置 Live2D 模型服务缓存并重新加载（实现用户隔离）
  live2dModelService.resetApiStatus()
  await loadRemoteModels()

  // 连接通知 WebSocket（获取好感度数据 + 主动推送）
  const token = localStorage.getItem('authToken')
  if (token) {
    notificationWs.connect(token)
    // WebSocket 连接成功后立即加载初始数据（补拉离线期间的日记）
    setupNotificationWsInitialLoad()
  }

  // 登录成功后加载 AI 模型列表
  loadAiModels()
}

// 设置通知 WebSocket 连接成功后的初始数据加载（补拉离线期间的日记）
const setupNotificationWsInitialLoad = () => {
  const unsubscribe = notificationWs.onConnected(async () => {
    // 确保用户仍处于登录状态
    if (!isLoggedIn.value) {
      console.log('[App] 用户未登录，跳过初始数据加载')
      unsubscribe()
      return
    }

    console.log('[App] NotificationWS 已连接，开始加载初始数据（补拉离线日记）')
    
    try {
      const engagementService = getUserEngagementService()
      const initialData = await engagementService.loadInitialData()
      
      console.log('[App] 初始数据加载完成:', {
        hasRelationship: !!initialData.relationship,
        unreadDiaryCount: initialData.unreadDiaryCount,
        recentDiariesCount: initialData.recentDiaries.length
      })
      
      // 如果有离线期间的新日记，更新日记列表
      if (initialData.recentDiaries.length > 0) {
        appDiaryList.value = initialData.recentDiaries
        console.log(`[App] 已补拉 ${initialData.recentDiaries.length} 条离线日记`)
      }
    } catch (error) {
      console.error('[App] 加载初始数据失败:', error)
    } finally {
      // 只需要执行一次，执行后取消订阅
      unsubscribe()
    }
  })
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

  // 断开通知 WebSocket
  notificationWs.disconnect()

  // 清空日记相关数据（防止退出后仍能看到日记内容）
  showDiaryPanel.value = false
  appDiaryList.value = []
  isLoadingAppDiary.value = false

  // 清空远程模型数据并重置服务状态（实现用户隔离）
  remoteModels.value = []
  live2dModelService.resetApiStatus()

  // 重新生成匿名ID，或者保留原ID取决于业务需求
  wsConfig.value.openid = generateAnonymousUserId()
  wsConfig.value.aiSessionId = generateSessionId()

  localStorage.removeItem('userInfo')
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('authToken')
  authService.logout()
  console.log('已退出登录')

  // 重新初始化模型（使用本地/默认模型）
  initializeDefaultModel()
}

// 注册 401 未授权回调：token 失效时自动退出登录
setUnauthorizedHandler(() => {
  if (isLoggedIn.value) {
    handleLogout()
  }
})

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
    const models = await aiModelConfigService.getDisplayModelsWithCustom()
    aiModels.value = models

    // 尝试加载用户的偏好设置
    const preference = await aiModelSwitchService.getUserPreference()
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
 * 要求用户登录才能使用功能
 * 未登录时弹出登录窗口并返回 false
 */
const requireAuth = (): boolean => {
  if (!isLoggedIn.value) {
    showUserAuthModal.value = true
    return false
  }
  return true
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

      // 恢复登录状态后连接通知 WebSocket
      const token = localStorage.getItem('authToken')
      if (token) {
        notificationWs.connect(token)
        // WebSocket 连接成功后立即加载初始数据（补拉离线期间的日记）
        setupNotificationWsInitialLoad()
      }

      // 恢复登录状态后加载 AI 模型列表
      loadAiModels()

      // 恢复登录状态后重新加载 Live2D 模型列表（实现用户隔离）
      live2dModelService.resetApiStatus()
      loadRemoteModels()
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

// 初始化：验证并设置默认有效模型
initializeDefaultModel()

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

  // 确保通知 WebSocket 在已登录状态下常驻连接
  if (isLoggedIn.value) {
    const token = localStorage.getItem('authToken')
    if (token && !notificationWs.isConnected.value) {
      notificationWs.connect(token)
      // WebSocket 连接成功后立即加载初始数据（补拉离线期间的日记）
      setupNotificationWsInitialLoad()
    }
  }

  try {
    // 初始化时加载远程 Live2D 模型列表
    await loadRemoteModels()
  } catch {
    console.warn('远程模型列表获取失败，使用本地模型')
  }

  if (isDesktop.value) {
    try {
      const { width: cfgW, height: cfgH } = displayCfg.window
      await (window as any).electronAPI?.setWindowSize(cfgW, cfgH)
      console.log(`✅ 窗口大小已设置为 ${cfgW}x${cfgH}`)
    } catch (e) {
      console.warn('⚠️ 设置窗口大小失败:', e)
    }
    // 窗口焦点管理：使用主进程 BrowserWindow blur/focus（比渲染进程 window.blur 更可靠）
    const api = getApi()
    api?.onWindowBlurred?.(() => onMainWindowBlurred())
    api?.onWindowFocused?.(() => onMainWindowFocused())
  }

  ;(async () => {
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

      .desktop-pet {
        background: transparent !important;
        background-color: transparent !important;
        box-shadow: none !important;
        border: none !important;
      }
    `
    document.head.appendChild(style)
  })()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
  document.removeEventListener('click', handleClickOutside)
  clearEnableIgnoreTimer()
  if (mousePenetrationListener) {
    document.removeEventListener('mousemove', mousePenetrationListener)
    mousePenetrationListener = null
  }
  if (autoMotionInterval) {
    clearInterval(autoMotionInterval)
    autoMotionInterval = null
  }
  if (autoExpressionInterval) {
    clearInterval(autoExpressionInterval)
    autoExpressionInterval = null
  }
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
  overflow: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
}

.app-container.desktop-pet::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.app-container.desktop-pet::-webkit-scrollbar-track {
  background: rgba(255, 182, 193, 0.1);
  border-radius: 3px;
}

.app-container.desktop-pet::-webkit-scrollbar-thumb {
  background: rgba(255, 107, 157, 0.4);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.app-container.desktop-pet::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 107, 157, 0.6);
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.background-board {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 50%, #FFCCD5 100%);
  border-radius: 20px;
  z-index: 0;
  transition: all 0.3s ease;
  overflow: hidden;
}

.background-board::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 6px;
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.4) 0%,
      transparent 50%
    );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.background-board::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  box-shadow:
    inset 0 2px 8px rgba(255, 182, 193, 0.15),
    inset 0 -2px 8px rgba(255, 240, 245, 0.25);
  pointer-events: none;
}

.background-board.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.drag-handle-top-right {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: grab;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;
  border: 1.5px solid rgba(255, 107, 157, 0.2);
}

.drag-handle-top-right:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.2);
}

.drag-handle-top-right:active {
  cursor: grabbing;
  transform: scale(0.95);
}

.drag-handle-top-right .drag-icon {
  width: 24px;
  height: 24px;
  display: block;
  opacity: 0.8;
  filter: brightness(0) saturate(100%) invert(60%) sepia(30%) saturate(500%) hue-rotate(320deg) brightness(90%);
  transition: all 0.3s ease;
}

.drag-handle-top-right:hover .drag-icon {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(50%) sepia(40%) saturate(600%) hue-rotate(330deg) brightness(95%);
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
  min-height: calc(100vh - 120px);
  height: auto;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  cursor: default;
  position: relative;
  z-index: 1;
}

.pet-model-area.desktop-pet:active {
  cursor: grabbing;
}

.pet-toolbar {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #FFE0EB;
}

.pet-toolbar.desktop-pet {
  position: fixed;
  bottom: 26px;
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

.background-btn {
  background: linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%);
}

.background-btn.active {
  background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%);
  box-shadow: 0 4px 16px rgba(255, 20, 147, 0.4);
}

.background-icon {
  font-size: 20px;
  line-height: 1;
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
  max-height: min(400px, calc(100vh - 120px));
  z-index: 1002;
  overflow-y: auto;
  animation: dropdownFadeIn 0.15s ease;
  border: 1px solid #FFE0EB;
  padding: 6px 0;
}

.more-dropdown::-webkit-scrollbar {
  width: 4px;
}

.more-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.more-dropdown::-webkit-scrollbar-thumb {
  background: rgba(255, 107, 157, 0.3);
  border-radius: 2px;
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

.dropdown-item.active {
  background: rgba(255, 107, 157, 0.12);
  color: #C44569;
  font-weight: 500;
}

.toggle-indicator {
  margin-left: auto;
  font-size: 16px;
  font-weight: bold;
  color: #FF6B9D;
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

  .relationship-bar-vertical {
    display: none;
  }
}

.app-container.native-app {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.app-container.native-app .pet-toolbar.desktop-pet {
  bottom: calc(26px + env(safe-area-inset-bottom));
}

/* 竖状好感度条（模型右上方） */
.relationship-bar-vertical {
  position: fixed;
  right: calc(50% - 140px);
  top: 12%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 5px;
  background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,245,250,0.88) 100%);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-radius: 14px;
  border: 1px solid rgba(255, 140, 170, 0.2);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    0 2px 12px rgba(255, 107, 157, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  z-index: 999;
}
.relationship-bar-vertical:hover {
  transform: translateY(-2px) scale(1.06);
  box-shadow:
    0 8px 28px rgba(255, 107, 157, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
.relationship-bar-vertical:active {
  transform: scale(0.96);
  transition-duration: 0.1s;
}
.rv-icon {
  font-size: 16px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
}
.rv-track {
  width: 6px;
  height: 80px;
  background: linear-gradient(180deg, rgba(200,190,210,0.25) 0%, rgba(220,210,225,0.18) 100%);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.08);
}
.rv-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  border-radius: 10px;
  transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.rv-glow {
  position: absolute;
  bottom: 0;
  left: -2px;
  width: calc(100% + 4px);
  height: 20px;
  border-radius: 10px;
  opacity: 0.35;
  filter: blur(4px);
  transition: height 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s;
  pointer-events: none;
}
.rv-label {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.2px;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

/* 更多菜单中的日记徽章 */
.diary-badge-inline {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #FF4444;
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
}

/* 更多菜单中的用户信息 */
.dropdown-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  margin-bottom: 2px;
}
.dropdown-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.dropdown-username {
  font-size: 13px;
  color: #e0e0e8;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dropdown-user-id {
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}
</style>

<!-- 非scoped样式：用于Teleport到body的日记面板 -->
<style>
.diary-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: diaryFadeIn 0.2s ease;
}

@keyframes diaryFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.diary-modal {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 450px;
  height: 70vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: diaryModalSlideIn 0.3s ease;
}

@keyframes diaryModalSlideIn {
  from {
    transform: scale(0.9) translateY(20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.diary-modal .diary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  border-radius: 20px 20px 0 0;
}

.diary-modal .diary-title {
  font-size: 18px;
  font-weight: 600;
}

.diary-modal .diary-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.diary-modal .diary-close-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: rotate(90deg);
}

.diary-modal .diary-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #FFF5F9;
}

.diary-modal .diary-loading,
.diary-modal .diary-empty {
  text-align: center;
  padding: 60px 20px;
  color: #C44569;
  font-size: 14px;
}

.diary-modal .diary-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.diary-modal .empty-icon {
  font-size: 48px;
}

.diary-modal .empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #C44569;
}

.diary-modal .empty-hint {
  font-size: 13px;
  color: #999;
}

.diary-modal .diary-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.diary-modal .diary-item {
  background: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(255, 107, 157, 0.08);
  transition: transform 0.2s ease;
}

.diary-modal .diary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.15);
}

.diary-modal .diary-date {
  font-size: 14px;
  font-weight: 600;
  color: #C44569;
  margin-bottom: 10px;
}

.diary-modal .diary-content-text {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.diary-modal .diary-body::-webkit-scrollbar {
  width: 6px;
}

.diary-modal .diary-body::-webkit-scrollbar-track {
  background: transparent;
}

.diary-modal .diary-body::-webkit-scrollbar-thumb {
  background: rgba(255, 107, 157, 0.2);
  border-radius: 3px;
}

.diary-modal .diary-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 107, 157, 0.3);
}
</style>
