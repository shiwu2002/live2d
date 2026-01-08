<template>
  <div class="app-container">
    <!-- 页面主要内容区域 -->
    <div class="main-content">
      <h1>Live2D 小窗口展示</h1>
      <p>模型会固定在右下角的小窗口中展示，可以切换不同的模型</p>
    </div>

    <!-- 固定的 Live2D 小窗口 -->
    <div class="live2d-widget">
      <div class="widget-header">
        <span class="widget-title">{{ currentModelName }}</span>
        <button class="close-btn" @click="toggleWidget" :title="isWidgetVisible ? '隐藏' : '显示'">
          {{ isWidgetVisible ? '−' : '+' }}
        </button>
      </div>
      
      <div class="widget-body" v-show="isWidgetVisible">
        <Live2DModel
          :key="currentModel"
          :modelPath="modelPath"
          :width="widgetWidth"
          :height="widgetHeight"
        />
      </div>
      
      <div class="widget-controls" v-show="isWidgetVisible">
        <select v-model="currentModel" @change="handleModelChange" class="model-selector">
          <option 
            v-for="modelId in availableModels" 
            :key="modelId" 
            :value="modelId"
          >
            {{ modelConfig[modelId]?.name || modelId }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Live2DModel from './components/Live2DModel.vue'
import { modelConfig, getModelIds } from './config/models'

// 获取所有可用的模型 ID
const availableModels = getModelIds()

// 当前选中的模型
const currentModel = ref(availableModels[0] || 'biaoqiang_3')

// 计算当前模型路径
const modelPath = computed(() => modelConfig[currentModel.value]?.path || '')

// 计算当前模型显示名称
const currentModelName = computed(() => modelConfig[currentModel.value]?.name || '未知模型')

// 小窗口配置 - 固定尺寸，适合 Live2D 模型显示比例
const widgetWidth = ref(300)
const widgetHeight = ref(400)

// 小窗口显示状态
const isWidgetVisible = ref(true)

// 模型切换处理
const handleModelChange = () => {
  console.log('切换模型:', currentModel.value)
}

// 切换小窗口显示/隐藏
const toggleWidget = () => {
  isWidgetVisible.value = !isWidgetVisible.value
}
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
  
  .main-content h1 {
    font-size: 2rem;
  }
  
  .main-content p {
    font-size: 1rem;
  }
}
</style>
