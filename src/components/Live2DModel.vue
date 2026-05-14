<template>
  <div ref="canvasContainer" class="live2d-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Application } from '@pixi/app'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { extensions } from '@pixi/extensions'
import type { Live2DModel as Live2DModelType } from 'pixi-live2d-display/cubism4'
import type { Live2DAnimationCommand, Live2DAnimationInfo, Live2DEmotion } from '../types/live2d'
import { resolveAnimation } from '../config/emotionMap'


const props = defineProps<{
  modelPath: string
  modelId?: string
  width?: number
  height?: number
  x?: number
  y?: number
  scale?: number
  hideBackground?: boolean
}>()

const canvasContainer = ref<HTMLDivElement>()
let app: Application | null = null
let model: Live2DModelType | null = null
let mouseMoveRaf = 0
let lastMouseX = 0
let lastMouseY = 0
let tickerRegistered = false
let resizeObserver: ResizeObserver | null = null
let backgroundDrawableIndices: number[] = []

const identifyBackgroundDrawables = () => {
  backgroundDrawableIndices = []
  if (!model?.internalModel) return

  const coreModel = (model.internalModel as any).coreModel
  const drawables = coreModel?._model?.drawables
  if (!drawables?.renderOrders) return

  const renderOrders = Array.from(drawables.renderOrders as Float32Array)
  if (renderOrders.length === 0) return

  const minRenderOrder = Math.min(...renderOrders)

  renderOrders.forEach((order, index) => {
    if (order === minRenderOrder) {
      backgroundDrawableIndices.push(index)
    }
  })

  if (backgroundDrawableIndices.length > 0) {
    console.log('Identified background drawables:', backgroundDrawableIndices.map(i => ({
      index: i,
      id: drawables.ids?.[i],
      renderOrder: drawables.renderOrders?.[i]
    })))
  }
}

const blinkState = {
  phase: 'idle' as 'idle' | 'closing' | 'opening',
  progress: 0,
  delayMs: 3000 + Math.random() * 5000
}

extensions.add(TickerPlugin)

const initPixiApp = () => {
  if (!canvasContainer.value) return

  const rect = canvasContainer.value.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))

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

const loadModel = async () => {
  if (!app) return

  try {
    const { Live2DModel } = await import('pixi-live2d-display/cubism4')
    if (!tickerRegistered) {
      Live2DModel.registerTicker(Ticker)
      tickerRegistered = true
    }
    model = await Live2DModel.from(props.modelPath, {
      autoInteract: false
    })

    app.stage.addChild(model)
    model.anchor.set(0.5, 0.5)

    if (props.x !== undefined && props.y !== undefined && props.scale !== undefined) {
      model.x = props.x
      model.y = props.y
      model.scale.set(props.scale)
    } else {
      const containerWidth = app.screen.width
      const containerHeight = app.screen.height
      const modelWidth = model.width
      const modelHeight = model.height
      const scaleX = (containerWidth * 0.8) / modelWidth
      const scaleY = (containerHeight * 0.8) / modelHeight
      const optimalScale = Math.min(scaleX, scaleY)
      model.scale.set(optimalScale)
      model.x = containerWidth / 2
      model.y = containerHeight / 2
    }

    if (model.internalModel.motionManager) {
      await model.motion('idle', 0)
    }

    adjustModelToContainer()

    identifyBackgroundDrawables()

    console.log('Live2D 模型加载成功', {
      modelSize: { width: model.width, height: model.height },
      scale: model.scale.x,
      position: { x: model.x, y: model.y }
    })
  } catch (error) {
    console.error('Live2D 模型加载失败:', error)
  }
}

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

const onResize = () => {
  if (!app || !canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  app.renderer.resize(width, height)
  adjustModelToContainer()
}

const startRenderLoop = () => {
  if (!app) return
  app.ticker.add(() => {
    if (app) {
      updateBlink(app.ticker.deltaMS)

      if (props.hideBackground && model?.internalModel && backgroundDrawableIndices.length > 0) {
        const coreModel = (model.internalModel as any).coreModel
        const drawables = coreModel?._model?.drawables
        if (drawables?.opacities) {
          backgroundDrawableIndices.forEach(index => {
            drawables.opacities[index] = 0
          })
        }
      }
    }
  })
}

const playMotion = (group: string, index = 0) => {
  if (!model) {
    console.warn('Live2D 模型未加载，无法播放动作')
    return
  }
  try {
    model.motion(group, index)
    console.log(`播放动作: ${group}[${index}]`)
  } catch (e) {
    console.warn(`播放动作失败: ${group}[${index}]`, e)
  }
}

const playExpression = (name: string) => {
  if (!model) {
    console.warn('Live2D 模型未加载，无法播放表情')
    return
  }
  try {
    model.expression(name)
    console.log(`播放表情: ${name}`)
  } catch (e) {
    console.warn(`播放表情失败: ${name}`, e)
  }
}

const executeAnimation = (command: Live2DAnimationCommand) => {
  const resolved = command.emotion && props.modelId
    ? resolveAnimation(props.modelId, command)
    : command

  if (!resolved) return

  if (resolved.expression) {
    playExpression(resolved.expression.name)
  }
  if (resolved.motion) {
    playMotion(resolved.motion.group, resolved.motion.index ?? 0)
  }
}

const executeEmotion = (emotion: Live2DEmotion) => {
  if (!props.modelId) {
    console.warn('未提供 modelId，无法解析情绪标签')
    return
  }
  const resolved = resolveAnimation(props.modelId, { emotion })
  if (resolved) {
    executeAnimation(resolved)
  }
}

const getAnimationInfo = (): Live2DAnimationInfo => {
  if (!model?.internalModel) {
    return { motionGroups: [], expressions: [] }
  }

  const motionGroups: string[] = []
  const expressions: string[] = []

  try {
    const motionManager = (model.internalModel as any).motionManager
    if (motionManager?.motionGroups) {
      Object.keys(motionManager.motionGroups).forEach(key => {
        motionGroups.push(key)
      })
    }

    const settings = (model.internalModel as any).settings
    if (settings?.expressions) {
      settings.expressions.forEach((exp: any) => {
        const rawName: string | undefined = exp.Name || exp.name || exp.File || exp.file
        if (rawName) {
          expressions.push(rawName.replace(/\.exp3\.json$/i, ''))
        }
      })
    }
  } catch (e) {
    console.warn('获取模型动画信息失败:', e)
  }

  return { motionGroups, expressions }
}

const playRandomMotion = () => {
  const info = getAnimationInfo()
  if (info.motionGroups.length === 0) return
  const nonIdleGroups = info.motionGroups.filter(g => g.toLowerCase() !== 'idle')
  const groups = nonIdleGroups.length > 0 ? nonIdleGroups : info.motionGroups
  const group = groups[Math.floor(Math.random() * groups.length)]!
  playMotion(group, 0)
}

const playRandomExpression = () => {
  const info = getAnimationInfo()
  if (info.expressions.length === 0) return
  const name = info.expressions[Math.floor(Math.random() * info.expressions.length)]!
  playExpression(name)
}

defineExpose({
  playMotion,
  playExpression,
  executeAnimation,
  executeEmotion,
  getAnimationInfo,
  playRandomMotion,
  playRandomExpression,
})

onMounted(async () => {
  initPixiApp()
  await loadModel()
  startRenderLoop()

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('resize', onResize)

  if ('ResizeObserver' in window && canvasContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!app || !canvasContainer.value) return
      const rect = canvasContainer.value.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      app.renderer.resize(width, height)
      adjustModelToContainer()
    })
    resizeObserver.observe(canvasContainer.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', onResize)
  if (mouseMoveRaf) {
    cancelAnimationFrame(mouseMoveRaf)
    mouseMoveRaf = 0
  }
  if (resizeObserver && canvasContainer.value) {
    resizeObserver.unobserve(canvasContainer.value)
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (app) {
    app.ticker.stop()
    app.destroy(true, { children: true })
    app = null
  }

  model = null
})

watch(() => props.modelPath, async () => {
  if (model && app) {
    backgroundDrawableIndices = []
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
