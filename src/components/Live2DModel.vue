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
    width: width * 2,
    height: height * 2,
    backgroundAlpha: 0,
    preserveDrawingBuffer: true,
    autoDensity: false,
    resolution: 1,
  })

  app.stage.scale.set(2)
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

    // 设置模型位置和缩放
    model.anchor.set(0.5, 0.5)
    model.x = props.x || (app.screen.width / 4)
    model.y = props.y || (app.screen.height / 2)
    model.scale.set(props.scale || 0.3)

    // 播放默认动画
    if (model.internalModel.motionManager) {
      await model.motion('idle', 0)
    }

    console.log('Live2D 模型加载成功')
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
  if (!model || !canvasContainer.value) return

  const rect = canvasContainer.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) * 2
  const y = (event.clientY - rect.top) * 2

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
