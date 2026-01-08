<template>
  <div class="app-container">
    <Live2DModel
      :modelPath="modelPath"
      :width="windowWidth"
      :height="windowHeight"
      :x="modelX"
      :y="modelY"
      :scale="modelScale"
    />
    
    <div class="controls">
      <h2>Live2D 桌面端</h2>
      <p>鼠标移动可与模型互动</p>
      <div class="control-group">
        <label>模型缩放:</label>
        <input 
          type="range" 
          v-model.number="modelScale" 
          min="0.1" 
          max="1" 
          step="0.05"
        />
        <span>{{ modelScale.toFixed(2) }}</span>
      </div>
      <div class="control-group">
        <label>X 位置:</label>
        <input 
          type="range" 
          v-model.number="modelX" 
          :min="0" 
          :max="windowWidth * 2" 
          step="10"
        />
        <span>{{ modelX }}</span>
      </div>
      <div class="control-group">
        <label>Y 位置:</label>
        <input 
          type="range" 
          v-model.number="modelY" 
          :min="0" 
          :max="windowHeight * 2" 
          step="10"
        />
        <span>{{ modelY }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Live2DModel from './components/Live2DModel.vue'

// 模型配置
const modelPath = '/model/biaoqiang_3/biaoqiang_3.model3.json'
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const modelScale = ref(0.3)
const modelX = ref(window.innerWidth * 0.5)
const modelY = ref(window.innerHeight * 0.8)

// 窗口大小调整处理
const handleResize = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
  // 重新计算模型位置（保持在屏幕中部偏下位置）
  modelX.value = window.innerWidth * 0.5
  modelY.value = window.innerHeight * 0.8
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.controls {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 1000;
  min-width: 280px;
}

.controls h2 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #333;
}

.controls p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #666;
}

.control-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-group label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.control-group input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  background: linear-gradient(to right, #667eea 0%, #764ba2 100%);
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.control-group input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.control-group span {
  font-size: 13px;
  color: #888;
  text-align: right;
}
</style>
