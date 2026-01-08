<template>
  <div ref="canvasContainer" class="live2d-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Application } from '@pixi/app'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { extensions } from '@pixi/extensions'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// 导入 ZIP 支持
import 'pixi-live2d-display/cubism4'

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
let model: Live2DModel | null = null
let lastTime = 0

// 眨眼状态
const blinkState = {
  phase: 'idle' as 'idle' | 'closing' | 'opening',
  progress: 0,
  delayMs: 3000 + Math.random() * 5000
}

// 注册 Live2D Ticker
Live2DModel.registerTicker(Ticker)
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
    preserveDrawingBuffer: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  })

  canvasContainer.value.appendChild(app.view as HTMLCanvasElement)
}

// 加载 Live2D 模型
const loadModel = async () => {
  if (!app) return

  try {
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

// 鼠标跟随
const handleMouseMove = (event: MouseEvent) => {
  if (!model || !canvasContainer.value || !app) return

  const rect = canvasContainer.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * app.screen.width
  const y = ((event.clientY - rect.top) / rect.height) * app.screen.height

  model.focus(x, y)
}

// 启动渲染循环
const startRenderLoop = () => {
  if (!app) return

  lastTime = Date.now()

  app.ticker.add(() => {
    const now = Date.now()
    const deltaTime = now - lastTime
    lastTime = now

    updateBlink(deltaTime)
  })
}

// 组件挂载
onMounted(async () => {
  initPixiApp()
  await loadModel()
  startRenderLoop()

  // 添加鼠标跟随
  window.addEventListener('mousemove', handleMouseMove)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)

  if (app) {
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
