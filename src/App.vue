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
    />

    <!-- 语音通话窗口 -->
    <VoiceCall
      v-if="showVoiceCall"
      :visible="showVoiceCall"
      :ws-url="voiceWsUrl"
      :openid="wsConfig.openid"
      :ai-session-id="wsConfig.aiSessionId"
      @close="showVoiceCall = false"
    />

    <!-- 扫码登录窗口 -->
    <QRCodeLogin
      :visible="showQRCodeLogin"
      :ws-url="qrcodeLoginWsUrl"
      @close="showQRCodeLogin = false"
      @login-success="handleLoginSuccess"
      @login-failed="handleLoginFailed"
    />

    <!-- 用户名密码登录注册窗口 -->
    <UserAuthModal
      :visible="showUserAuthModal"
      @close="showUserAuthModal = false"
      @login-success="handleUserAuthLoginSuccess"
      @register-success="handleUserAuthRegisterSuccess"
    />

    <!-- 固定的 Live2D 小窗口 -->
    <div class="live2d-widget" v-if="discoveredModels.length > 0">
      <div class="widget-header">
        <span class="widget-title">{{ currentModelName }}</span>
        <button class="close-btn" @click="toggleWidget" :title="isWidgetVisible ? '隐藏' : '显示'">
          {{ isWidgetVisible ? '−' : '+' }}
        </button>
      </div>
      
      <div class="widget-body" v-show="isWidgetVisible">
        <Live2DModel
          v-if="modelPath"
          :key="currentModel"
          :modelPath="modelPath"
          :width="widgetWidth"
          :height="widgetHeight"
        />
      </div>
      
      <div class="widget-controls" v-show="isWidgetVisible">
        <select v-model="currentModel" class="model-selector">
          <option v-for="model in discoveredModels" :key="model.id" :value="model.id">
            {{ model.name }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- 控制台按钮面板 -->
    <div class="control-panel" v-if="discoveredModels.length > 0">
      <div class="control-buttons">
        <button 
          v-if="!isLoggedIn" 
          class="control-btn login-btn" 
          @click="toggleUserAuthModal" 
          title="账号密码登录"
        >
          <span>🔐</span>
        </button>
        <button 
          v-if="!isLoggedIn" 
          class="control-btn qrcode-btn" 
          @click="toggleQRCodeLogin" 
          title="扫码登录"
        >
          <span>📱</span>
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
        <button class="control-btn" @click="playRandomMotion" title="随机动作">
          <span>🎭</span>
        </button>
        <button class="control-btn" @click="changeExpression" title="切换表情">
          <span>😊</span>
        </button>
        <button class="control-btn" @click="toggleWidget" title="显示/隐藏">
          <span>{{ isWidgetVisible ? '👁️' : '👁️‍🗨️' }}</span>
        </button>
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
import { ref, computed, watch } from 'vue'
import Live2DModel from './components/Live2DModel.vue'
import ChatWindow from './components/ChatWindow.vue'
import VoiceCall from './components/VoiceCall.vue'
import QRCodeLogin from './components/QRCodeLogin.vue'
import UserAuthModal from './components/UserAuthModal.vue'
import { autoModelConfig, getAutoModelIds } from './config/auto-models'
import { getChatConfig, generateSessionId } from './config'
import { getWebSocketUrl, logEnvConfig } from './config'
import type { UserLoginInfo, UserInfo } from './types/login'
import { authService } from './services/authService'

// 模型信息接口
interface ModelInfo {
  id: string
  name: string
  path: string
}

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

// 聊天窗口状态
const showChat = ref(false)

// 语音通话窗口状态
const showVoiceCall = ref(false)

// 扫码登录窗口状态
const showQRCodeLogin = ref(false)

// 用户名密码登录窗口状态
const showUserAuthModal = ref(false)

// 用户登录状态
const isLoggedIn = ref(false)
const currentUser = ref<UserLoginInfo | null>(null)

// WebSocket 配置（从环境配置加载）
const wsConfig = ref(getChatConfig({
  baseUrl: getWebSocketUrl('chat'), // 从环境配置读取聊天服务WebSocket地址
  aiSessionId: generateSessionId()
}))

// 获取其他WebSocket服务的URL
const voiceWsUrl = getWebSocketUrl('voice')
const qrcodeLoginWsUrl = getWebSocketUrl('qrcodeLogin')

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
  console.log('播放随机动作')
  // 这里可以添加触发Live2D模型动作的逻辑
}

// 切换表情
const changeExpression = () => {
  console.log('切换表情')
  // 这里可以添加切换Live2D模型表情的逻辑
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

// 切换扫码登录窗口
const toggleQRCodeLogin = () => {
  showQRCodeLogin.value = !showQRCodeLogin.value
  console.log(`扫码登录窗口: ${showQRCodeLogin.value ? '打开' : '关闭'}`)
}

// 切换用户名密码登录窗口
const toggleUserAuthModal = () => {
  showUserAuthModal.value = !showUserAuthModal.value
  console.log(`用户名密码登录窗口: ${showUserAuthModal.value ? '打开' : '关闭'}`)
}

// 处理登录成功（扫码登录）
const handleLoginSuccess = (userInfo: UserLoginInfo) => {
  console.log('扫码登录成功:', userInfo)
  isLoggedIn.value = true
  currentUser.value = userInfo
  
  // 更新WebSocket配置
  wsConfig.value.openid = userInfo.openid
  wsConfig.value.aiSessionId = userInfo.sessionId // 传递正确的sessionId
  
  // 保存登录信息到本地存储
  localStorage.setItem('userInfo', JSON.stringify(userInfo))
  localStorage.setItem('isLoggedIn', 'true')
  
  console.log('扫码登录状态已更新 - openid:', userInfo.openid, 'sessionId:', userInfo.sessionId)
}

// 处理登录失败
const handleLoginFailed = (error: string) => {
  console.error('登录失败:', error)
  alert(`登录失败: ${error}`)
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
  localStorage.removeItem('userInfo')
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('authToken')
  authService.logout()
  console.log('已退出登录')
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
      
      // 更新WebSocket配置
      wsConfig.value.openid = userInfo.openid
      wsConfig.value.aiSessionId = userInfo.sessionId // 恢复正确的sessionId
      
      console.log('恢复登录状态 - openid:', userInfo.openid, 'sessionId:', userInfo.sessionId)
    } catch (error) {
      console.error('解析本地登录信息失败:', error)
      handleLogout()
    }
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
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
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
  bottom: 20px;
  right: 20px;
  width: 300px;
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
  right: 340px; /* 小窗口宽度300px + 间距20px + 边距20px */
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  padding: 16px;
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
  flex-direction: column;
  gap: 12px;
}

.control-btn {
  width: 56px;
  height: 56px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  cursor: pointer;
  font-size: 24px;
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
  .live2d-widget {
    width: 280px;
    bottom: 10px;
    right: 10px;
  }
  
  .widget-body {
    height: 360px;
  }
  
  .control-panel {
    right: 300px;
    padding: 12px;
  }
  
  .control-btn {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
  
  .user-info-panel {
    top: 10px;
    right: 10px;
    padding: 12px 16px;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
  }
  
  .user-nickname {
    font-size: 14px;
  }
  
  .user-id {
    font-size: 11px;
  }
  
  .main-content h1 {
    font-size: 2rem;
  }
  
  .main-content p {
    font-size: 1rem;
  }
}
</style>
