<template>
  <div class="android-feature-panel">
    <div class="afp-header">
      <span class="afp-title">📱 Android 专属功能</span>
      <button class="afp-close" @click="$emit('close')">✕</button>
    </div>

    <div class="afp-content">
      <div class="afp-section">
        <div class="afp-section-title">快捷操作</div>
        <div class="afp-grid">
          <button class="afp-card" @click="handleVibrate" :class="{ active: isVibrating }">
            <span class="afp-card-icon">📳</span>
            <span class="afp-card-label">震动反馈</span>
          </button>
          <button class="afp-card" @click="handleShareApp">
            <span class="afp-card-icon">📤</span>
            <span class="afp-card-label">分享应用</span>
          </button>
          <button class="afp-card" @click="toggleFullscreen" :class="{ active: isFullscreen }">
            <span class="afp-card-icon">{{ isFullscreen ? '⬜' : '⬛' }}</span>
            <span class="afp-card-label">{{ isFullscreen ? '退出全屏' : '全屏模式' }}</span>
          </button>
          <button class="afp-card" @click="handleKeepScreenOn" :class="{ active: keepScreenOn }">
            <span class="afp-card-icon">💡</span>
            <span class="afp-card-label">保持屏幕常亮</span>
          </button>
        </div>
      </div>

      <div class="afp-section">
        <div class="afp-section-title">显示设置</div>
        <div class="afp-list">
          <div class="afp-item" @click="toggleStatusBarVisible">
            <div class="afp-item-info">
              <span class="afp-item-icon">📊</span>
              <span class="afp-item-text">状态栏</span>
            </div>
            <div class="afp-toggle" :class="{ on: statusBarVisible }"></div>
          </div>
          <div class="afp-item" @click="toggleImmersiveMode">
            <div class="afp-item-info">
              <span class="afp-item-icon">🎯</span>
              <span class="afp-item-text">沉浸模式</span>
            </div>
            <div class="afp-toggle" :class="{ on: immersiveMode }"></div>
          </div>
        </div>
      </div>

      <div class="afp-section">
        <div class="afp-section-title">系统交互</div>
        <div class="afp-list">
          <div class="afp-item" @click="handleOpenSettings">
            <div class="afp-item-info">
              <span class="afp-item-icon">⚙️</span>
              <span class="afp-item-text">应用设置</span>
            </div>
            <span class="afp-arrow">›</span>
          </div>
          <div class="afp-item" @click="handleOpenBrowser">
            <div class="afp-item-info">
              <span class="afp-item-icon">🌐</span>
              <span class="afp-item-text">在浏览器打开</span>
            </div>
            <span class="afp-arrow">›</span>
          </div>
        </div>
      </div>

      <div class="afp-info">
        <div class="afp-version">版本 {{ appVersion }}</div>
        <div class="afp-platform">运行平台: Android</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineEmits<{
  close: []
}>()

const isVibrating = ref(false)
const isFullscreen = ref(false)
const keepScreenOn = ref(false)
const statusBarVisible = ref(true)
const immersiveMode = ref(false)
const appVersion = ref('1.1.1')

let Haptics: any = null
let Share: any = null
let CapApp: any = null
let StatusBar: any = null
let Browser: any = null

onMounted(async () => {
  try {
    const hapticsModule = await import('@capacitor/haptics')
    Haptics = hapticsModule.Haptics
    const shareModule = await import('@capacitor/share')
    Share = shareModule.Share
    const appModule = await import('@capacitor/app')
    CapApp = appModule.App
    const statusModule = await import('@capacitor/status-bar')
    StatusBar = statusModule.StatusBar
    const browserModule = await import('@capacitor/browser')
    Browser = browserModule.Browser
  } catch (e) {
    console.warn('[AndroidFeaturePanel] Some native modules not available:', e)
  }

  try {
    const appModule = await import('@capacitor/app')
    CapApp = appModule.App
    const statusModule = await import('@capacitor/status-bar')
    StatusBar = statusModule.StatusBar
    const browserModule = await import('@capacitor/browser')
    Browser = browserModule.Browser
  } catch (e) {
    console.warn('[AndroidFeaturePanel] Some native modules not available:', e)
  }

  appVersion.value = '1.1.1'
})

const handleVibrate = async () => {
  if (!Haptics) return
  try {
    isVibrating.value = true
    await Haptics.vibrate({ duration: 100 })
    setTimeout(() => {
      isVibrating.value = false
    }, 200)
  } catch (e) {
    console.error('Vibration failed:', e)
    isVibrating.value = false
  }
}

const handleShareApp = async () => {
  if (!Share) return
  try {
    await Share.share({
      title: 'Live2D桌宠',
      text: '来看看这个可爱的 Live2D 桌宠应用！',
      url: 'https://github.com/your-repo/live2d-desktop-pet',
      dialogTitle: '分享 Live2D 桌宠'
    })
  } catch (e) {
    console.error('Share failed:', e)
  }
}

const toggleFullscreen = async () => {
  if (!CapApp) return
  try {
    if (!isFullscreen.value) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    isFullscreen.value = !isFullscreen.value
  } catch (e) {
    console.error('Toggle fullscreen failed:', e)
  }
}

const handleKeepScreenOn = async () => {
  keepScreenOn.value = !keepScreenOn.value
  try {
    if (keepScreenOn.value) {
      await navigator.wakeLock.request('screen')
      console.log('Wake lock acquired')
    } else {
      console.log('Wake lock release would go here')
    }
  } catch (e) {
    console.error('Wake lock failed:', e)
    keepScreenOn.value = !keepScreenOn.value
  }
}

const toggleStatusBarVisible = async () => {
  if (!StatusBar) return
  try {
    statusBarVisible.value = !statusBarVisible.value
    if (statusBarVisible.value) {
      await StatusBar.show()
    } else {
      await StatusBar.hide()
    }
  } catch (e) {
    console.error('Toggle status bar failed:', e)
  }
}

const toggleImmersiveMode = () => {
  immersiveMode.value = !immersiveMode.value
  console.log('Immersive mode:', immersiveMode.value ? 'enabled' : 'disabled')
}

const handleOpenSettings = async () => {
  if (!CapApp) return
  try {
    await CapApp.openNativeSettings()
  } catch (e) {
    console.error('Open settings failed:', e)
  }
}

const handleOpenBrowser = async () => {
  if (!Browser) return
  try {
    await Browser.open({ url: window.location.href })
  } catch (e) {
    console.error('Open browser failed:', e)
  }
}
</script>

<style scoped>
.android-feature-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: afpFadeIn 0.25s ease;
}

@keyframes afpFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.afp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  border-radius: 24px 24px 0 0;
}

.afp-title {
  font-size: 18px;
  font-weight: 600;
}

.afp-close {
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

.afp-close:hover {
  background: rgba(255, 255, 255, 0.35);
  transform: rotate(90deg);
}

.afp-content {
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  background: white;
  border-radius: 24px 24px 0 0;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom, 20px);
}

.afp-content::-webkit-scrollbar {
  width: 4px;
}

.afp-content::-webkit-scrollbar-thumb {
  background: rgba(255, 107, 157, 0.3);
  border-radius: 2px;
}

.afp-section {
  padding: 20px 24px;
  border-bottom: 1px solid #f5f5f5;
}

.afp-section:last-of-type {
  border-bottom: none;
}

.afp-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #FF6B9D;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.afp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.afp-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  border: none;
  background: linear-gradient(135deg, #FFF5F9 0%, #ffffff 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.08);
}

.afp-card:hover,
.afp-card.active {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 20px rgba(255, 107, 157, 0.18);
  background: linear-gradient(135deg, #FFE8F0 0%, #FFF5F9 100%);
}

.afp-card:active {
  transform: scale(0.97);
  transition-duration: 0.1s;
}

.afp-card-icon {
  font-size: 28px;
  line-height: 1;
}

.afp-card-label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
  text-align: center;
}

.afp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.afp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 4px;
  cursor: pointer;
  transition: background 0.15s ease;
  border-radius: 10px;
  margin: 0 -8px;
  padding-left: 8px;
  padding-right: 8px;
}

.afp-item:hover {
  background: rgba(255, 107, 157, 0.06);
}

.afp-item:active {
  background: rgba(255, 107, 157, 0.1);
}

.afp-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.afp-item-icon {
  font-size: 20px;
  line-height: 1;
}

.afp-item-text {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.afp-toggle {
  width: 48px;
  height: 28px;
  background: #e0e0e0;
  border-radius: 14px;
  position: relative;
  transition: all 0.25s ease;
  flex-shrink: 0;
}

.afp-toggle::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: all 0.25s ease;
}

.afp-toggle.on {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
}

.afp-toggle.on::after {
  left: 23px;
}

.afp-arrow {
  font-size: 22px;
  color: #ccc;
  flex-shrink: 0;
}

.afp-info {
  padding: 20px 24px;
  text-align: center;
  background: #fafafa;
  border-top: 1px solid #f5f5f5;
}

.afp-version {
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
}

.afp-platform {
  font-size: 12px;
  color: #bbb;
}
</style>
