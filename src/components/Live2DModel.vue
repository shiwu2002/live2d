<template>
  <div ref="canvasContainer" class="live2d-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Application } from '@pixi/app'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { extensions } from '@pixi/extensions'
import type { Live2DModel as Live2DModelType } from 'pixi-live2d-display/cubism4'


const props = defineProps<{
  modelPath: string
  width?: number
  height?: number
  x?: number
  y?: number
  scale?: number
}>()

const canvasContainer = ref<HTMLDivElement>()
let app: Application | null = null
let model: Live2DModelType | null = null
let mouseMoveRaf = 0
let lastMouseX = 0
let lastMouseY = 0
let tickerRegistered = false

// 眨眼状态
const blinkState = {
  phase: 'idle' as 'idle' | 'closing' | 'opening',
  progress: 0,
  delayMs: 3000 + Math.random() * 5000
}

 // 注册 Pixi Ticker 插件
extensions.add(TickerPlugin)

// 初始化 Pixi 应用
const initPixiApp = () => {
  if (!canvasContainer.value) return

  const width = props.width || window.innerWidth
  const height = props.height || window.innerHeight

  app = new Application({
    width: width,
    height: height,
    backgroundAlpha: 0,
    preserveDrawingBuffer: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  })

  canvasContainer.value.appendChild(app.view as HTMLCanvasElement)
}

// 加载 Live2D 模型
const loadModel = async () => {
  if (!app) return

  try {
    const { Live2DModel } = await import('pixi-live2d-display/cubism4')
    if (!tickerRegistered) {
      // 仅注册一次 Ticker，避免重复注册导致的潜在问题
      Live2DModel.registerTicker(Ticker)
      tickerRegistered = true
    }
    model = await Live2DModel.from(props.modelPath, {
      autoInteract: false
    })

    app.stage.addChild(model)

    // 设置模型锚点为中心
    model.anchor.set(0.5, 0.5)

    // 如果提供了自定义位置和缩放，使用自定义值
    if (props.x !== undefined && props.y !== undefined && props.scale !== undefined) {
      model.x = props.x
      model.y = props.y
      model.scale.set(props.scale)
    } else {
      // 自动计算模型缩放和位置以适应容器
      const containerWidth = app.screen.width
      const containerHeight = app.screen.height

      // 获取模型原始尺寸
      const modelWidth = model.width
      const modelHeight = model.height

      // 计算缩放比例，确保模型完整显示在容器内，留出20%边距
      const scaleX = (containerWidth * 0.8) / modelWidth
      const scaleY = (containerHeight * 0.8) / modelHeight
      const optimalScale = Math.min(scaleX, scaleY)

      // 应用缩放
      model.scale.set(optimalScale)

      // 设置模型位置为容器正中心
      model.x = containerWidth / 2
      model.y = containerHeight / 2
    }

    // 播放默认动画
    if (model.internalModel.motionManager) {
      await model.motion('idle', 0)
    }

    console.log('Live2D 模型加载成功', {
      modelSize: { width: model.width, height: model.height },
      scale: model.scale.x,
      position: { x: model.x, y: model.y }
    })
  } catch (error) {
    console.error('Live2D 模型加载失败:', error)
  }
}

// 更新眨眼动画
const updateBlink = (deltaTime: number) => {
  if (!model || !model.internalModel) return

  const coreModel = model.internalModel.coreModel as any

  if (blinkState.phase === 'idle') {
    blinkState.delayMs -= deltaTime
    if (blinkState.delayMs <= 0) {
      blinkState.phase = 'closing'
      blinkState.progress = 0
    }
  } else if (blinkState.phase === 'closing') {
    blinkState.progress += deltaTime / 200
    const eyeOpen = 1 - Math.pow(Math.min(blinkState.progress, 1), 2)
    coreModel.setParameterValueById('ParamEyeLOpen', eyeOpen)
    coreModel.setParameterValueById('ParamEyeROpen', eyeOpen)

    if (blinkState.progress >= 1) {
      blinkState.phase = 'opening'
      blinkState.progress = 0
    }
  } else if (blinkState.phase === 'opening') {
    blinkState.progress += deltaTime / 200
    const eyeOpen = Math.pow(Math.min(blinkState.progress, 1), 2)
    coreModel.setParameterValueById('ParamEyeLOpen', eyeOpen)
    coreModel.setParameterValueById('ParamEyeROpen', eyeOpen)

    if (blinkState.progress >= 1) {
      blinkState.phase = 'idle'
      blinkState.delayMs = 3000 + Math.random() * 5000
    }
  }
}

 // 鼠标跟随（使用 rAF 节流，减少高频事件对主线程压力）
const handleMouseMove = (event: MouseEvent) => {
  if (!model || !canvasContainer.value || !app) return
  lastMouseX = event.clientX
  lastMouseY = event.clientY
  if (mouseMoveRaf) return
  mouseMoveRaf = window.requestAnimationFrame(() => {
    mouseMoveRaf = 0
    if (!model || !canvasContainer.value || !app) return
    const rect = canvasContainer.value.getBoundingClientRect()
    const x = ((lastMouseX - rect.left) / rect.width) * app.screen.width
    const y = ((lastMouseY - rect.top) / rect.height) * app.screen.height
    model.focus(x, y)
  })
}

// 根据容器大小调整模型缩放与居中
const adjustModelToContainer = () => {
  if (!app || !model) return
  const containerWidth = app.screen.width
  const containerHeight = app.screen.height
  const baseModelWidth = model.width / model.scale.x
  const baseModelHeight = model.height / model.scale.y
  const scaleX = (containerWidth * 0.8) / baseModelWidth
  const scaleY = (containerHeight * 0.8) / baseModelHeight
  const optimalScale = Math.min(scaleX, scaleY)
  model.scale.set(optimalScale)
  model.x = containerWidth / 2
  model.y = containerHeight / 2
}

// 窗口尺寸变化时自适应
const onResize = () => {
  if (!app) return
  const width = props.width || window.innerWidth
  const height = props.height || window.innerHeight
  app.renderer.resize(width, height)
  adjustModelToContainer()
}

 // 启动渲染循环
const startRenderLoop = () => {
  if (!app) return

  // 使用 app.ticker.deltaMS 获取毫秒增量，避免类型不匹配
  app.ticker.add(() => {
    if (app) updateBlink(app.ticker.deltaMS)
  })
}

 // 组件挂载
onMounted(async () => {
  initPixiApp()
  await loadModel()
  startRenderLoop()

  // 添加鼠标跟随与自适应
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', onResize)
})

 // 组件卸载
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', onResize)
  if (mouseMoveRaf) {
    cancelAnimationFrame(mouseMoveRaf)
    mouseMoveRaf = 0
  }

  if (app) {
    app.ticker.stop()
    app.destroy(true, { children: true })
    app = null
  }

  model = null
})

// 监听模型路径变化
watch(() => props.modelPath, async () => {
  if (model && app) {
    app.stage.removeChild(model)
    model.destroy()
    await loadModel()
  }
})
</script>

<style scoped>
.live2d-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.live2d-container canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
