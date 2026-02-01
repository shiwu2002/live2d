<template>
  <div class="qrcode-login-modal" v-if="visible" @click.self="handleClose">
    <div class="login-container">
      <!-- 头部 -->
      <div class="login-header">
        <h2>微信扫码登录</h2>
        <button class="close-btn" @click="handleClose" title="关闭">×</button>
      </div>

      <!-- 二维码区域 -->
      <div class="qrcode-area">
        <div v-if="isConnecting" class="loading-state">
          <div class="spinner"></div>
          <p>正在连接...</p>
        </div>

        <div v-else-if="qrcodeInfo" class="qrcode-content">
          <!-- 二维码图片 -->
          <div class="qrcode-wrapper" :class="{ expired: isExpired, scanned: isScanned }">
            <img :src="qrcodeInfo.qrcodeUrl" alt="登录二维码" class="qrcode-image" />
            
            <!-- 过期遮罩 -->
            <div v-if="isExpired" class="expired-overlay">
              <div class="expired-content">
                <span class="icon">⏰</span>
                <p>二维码已过期</p>
                <button class="refresh-btn" @click="handleRefresh">
                  <span class="icon">🔄</span>
                  刷新二维码
                </button>
              </div>
            </div>

            <!-- 已扫码遮罩 -->
            <div v-else-if="isScanned" class="scanned-overlay">
              <div class="scanned-content">
                <span class="icon success">✓</span>
                <p>扫码成功</p>
                <p class="tip">请在手机上确认登录</p>
              </div>
            </div>
          </div>

          <!-- 状态提示 -->
          <div class="status-tip">
            <template v-if="isPending">
              <p class="main-tip">请使用微信扫一扫</p>
              <p class="sub-tip">扫描二维码登录</p>
            </template>
            <template v-else-if="isScanned">
              <p class="main-tip">扫码成功</p>
              <p class="sub-tip">请在手机上确认登录</p>
            </template>
            <template v-else-if="isExpired">
              <p class="main-tip error">二维码已过期</p>
              <p class="sub-tip">请点击刷新按钮重新获取</p>
            </template>
          </div>

          <!-- 倒计时 -->
          <div v-if="isPending || isScanned" class="countdown">
            <span>{{ formatCountdown(remainingTime) }}</span>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="error-state">
          <span class="icon">⚠️</span>
          <p>{{ errorMessage }}</p>
          <button class="retry-btn" @click="handleRetry">重试</button>
        </div>
      </div>

      <!-- 底部说明 -->
      <div class="login-footer">
        <div class="tips">
          <p class="tip-title">💡 使用提示：</p>
          <ul class="tip-list">
            <li>打开微信小程序</li>
            <li>点击"扫一扫"功能</li>
            <li>扫描上方二维码</li>
            <li>在手机上确认登录</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { createQRCodeLoginService } from '../services/qrcodeLogin'
import { QRCodeLoginStatus } from '../types/login'
import type { QRCodeInfo, UserLoginInfo } from '../types/login'
import { getWebSocketUrl } from '../config'

// Props
interface Props {
  visible: boolean
  wsUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  wsUrl: getWebSocketUrl('qrcodeLogin')
})

// Emits
const emit = defineEmits<{
  close: []
  loginSuccess: [userInfo: UserLoginInfo]
  loginFailed: [error: string]
}>()

// 状态
const isConnecting = ref(true)
const qrcodeInfo = ref<QRCodeInfo | null>(null)
const errorMessage = ref('')
const remainingTime = ref(0)
const countdownTimer = ref<number | null>(null)

// 登录服务
let loginService: ReturnType<typeof createQRCodeLoginService> | null = null

// 计算属性
const isPending = computed(() => qrcodeInfo.value?.status === QRCodeLoginStatus.PENDING)
const isScanned = computed(() => qrcodeInfo.value?.status === QRCodeLoginStatus.SCANNED)
const isExpired = computed(() => qrcodeInfo.value?.status === QRCodeLoginStatus.EXPIRED)

// 格式化倒计时
const formatCountdown = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  return `${minutes}:${remainSeconds.toString().padStart(2, '0')}`
}

// 初始化登录服务
const initLoginService = async () => {
  try {
    isConnecting.value = true
    errorMessage.value = ''

    // 创建服务实例
    loginService = createQRCodeLoginService(props.wsUrl)

    // 设置回调
    loginService.setOnStatusChange((status, qrcode) => {
      console.log('二维码状态变化:', status)
      if (qrcode) {
        qrcodeInfo.value = qrcode
        if (status === QRCodeLoginStatus.PENDING || status === QRCodeLoginStatus.SCANNED) {
          startCountdown()
        } else {
          stopCountdown()
        }
      }
    })

    loginService.setOnLoginSuccess((userInfo) => {
      console.log('登录成功:', userInfo)
      stopCountdown()
      emit('loginSuccess', userInfo)
      // 延迟关闭，让用户看到成功提示
      setTimeout(() => {
        handleClose()
      }, 1500)
    })

    loginService.setOnLoginFailed((error) => {
      console.error('登录失败:', error)
      errorMessage.value = error
      stopCountdown()
      emit('loginFailed', error)
    })

    loginService.setOnWSConnected(() => {
      console.log('WebSocket已连接')
    })

    loginService.setOnWSDisconnected(() => {
      console.log('WebSocket已断开')
    })

    // 连接WebSocket
    await loginService.connect()

    // 生成二维码
    await loginService.generateQRCode()

    isConnecting.value = false
  } catch (error) {
    console.error('初始化登录服务失败:', error)
    errorMessage.value = '连接失败，请检查网络或重试'
    isConnecting.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  stopCountdown()
  
  const updateCountdown = () => {
    if (!qrcodeInfo.value) return
    
    const now = Date.now()
    const remaining = qrcodeInfo.value.expireTime - now
    
    if (remaining <= 0) {
      remainingTime.value = 0
      stopCountdown()
    } else {
      remainingTime.value = remaining
    }
  }
  
  updateCountdown()
  countdownTimer.value = window.setInterval(updateCountdown, 1000)
}

// 停止倒计时
const stopCountdown = () => {
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }
}

// 刷新二维码
const handleRefresh = async () => {
  if (!loginService) return
  
  try {
    errorMessage.value = ''
    await loginService.refreshQRCode()
  } catch (error) {
    console.error('刷新二维码失败:', error)
    errorMessage.value = '刷新失败，请重试'
  }
}

// 重试
const handleRetry = () => {
  errorMessage.value = ''
  initLoginService()
}

// 关闭
const handleClose = () => {
  stopCountdown()
  if (loginService) {
    loginService.disconnect()
    loginService = null
  }
  qrcodeInfo.value = null
  emit('close')
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    initLoginService()
  } else {
    handleClose()
  }
})

// 组件挂载时初始化
onMounted(() => {
  if (props.visible) {
    initLoginService()
  }
})

// 组件卸载时清理
onUnmounted(() => {
  handleClose()
})
</script>

<style scoped>
.qrcode-login-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.login-container {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.login-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 28px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.qrcode-area {
  padding: 40px 28px;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 加载状态 */
.loading-state {
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  font-size: 16px;
}

/* 二维码内容 */
.qrcode-content {
  width: 100%;
  text-align: center;
}

.qrcode-wrapper {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 0 auto 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.qrcode-wrapper.expired {
  filter: grayscale(1);
}

.qrcode-wrapper.scanned {
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.2);
}

.qrcode-image {
  width: 100%;
  height: 100%;
  display: block;
}

/* 过期遮罩 */
.expired-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.expired-content {
  text-align: center;
  color: white;
}

.expired-content .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.expired-content p {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.refresh-btn {
  padding: 10px 24px;
  background: white;
  color: #333;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background: #f0f0f0;
  transform: scale(1.05);
}

/* 已扫码遮罩 */
.scanned-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(76, 175, 80, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.scanned-content {
  text-align: center;
  color: white;
}

.scanned-content .icon {
  font-size: 64px;
  display: block;
  margin-bottom: 12px;
  animation: successPulse 0.6s ease;
}

@keyframes successPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.scanned-content p {
  margin: 0;
  font-size: 18px;
}

.scanned-content .tip {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.9;
}

/* 状态提示 */
.status-tip {
  margin-bottom: 16px;
}

.main-tip {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.main-tip.error {
  color: #f44336;
}

.sub-tip {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* 倒计时 */
.countdown {
  font-size: 14px;
  color: #999;
}

.countdown span {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

/* 错误状态 */
.error-state {
  text-align: center;
}

.error-state .icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.error-state p {
  color: #f44336;
  font-size: 16px;
  margin: 0 0 20px 0;
}

.retry-btn {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: #5568d3;
  transform: scale(1.05);
}

/* 底部说明 */
.login-footer {
  padding: 24px 28px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.tips {
  color: #666;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
}

.tip-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
}

.tip-list li {
  margin-bottom: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-container {
    width: 95%;
    max-width: none;
  }

  .qrcode-wrapper {
    width: 240px;
    height: 240px;
  }

  .login-header h2 {
    font-size: 18px;
  }
}
</style>
