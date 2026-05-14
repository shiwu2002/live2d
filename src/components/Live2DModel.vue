<template>
  <div ref="canvasContainer" class="live2d-container" :class="{ 'hide-background': hideBackground }"></div>
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
const backgroundMeshes: any[] = []

const identifyBackgroundDrawables = () => {
  backgroundDrawableIndices = []
  backgroundMeshes.length = 0
  if (!model?.internalModel) return

  const coreModel = (model.internalModel as any).coreModel
  const drawables = coreModel?._model?.drawables
  if (!drawables?.renderOrders) return

  const renderOrders = Array.from(drawables.renderOrders as Float32Array)
  if (renderOrders.length === 0) return

  // 找最小 renderOrder（背景层）
  const minRenderOrder = Math.min(...renderOrders)

  renderOrders.forEach((order, index) => {
    if (order === minRenderOrder) {
      backgroundDrawableIndices.push(index)
    }
  })

  console.log('✅ 背景检测完成 - 索引:', backgroundDrawableIndices, '最小 order:', minRenderOrder)

  // 尝试多种方法找到对应的 PIXI Mesh
  // 方法1: model._meshes (一维数组)
  const _meshes = (model as any)._meshes
  if (_meshes && Array.isArray(_meshes)) {
    backgroundDrawableIndices.forEach(idx => {
      if (_meshes[idx]) {
        backgroundMeshes.push(_meshes[idx])
        console.log(`  通过 _meshes[${idx}] 找到 mesh`)
      }
    })
  }

  // 方法2: model.meshes (二维数组)
  if (backgroundMeshes.length === 0) {
    const meshes = (model as any).meshes
    if (meshes && Array.isArray(meshes)) {
      meshes.forEach((row: any) => {
        if (Array.isArray(row)) {
          row.forEach((mesh: any, idx: number) => {
            if (backgroundDrawableIndices.includes(idx) && mesh) {
              backgroundMeshes.push(mesh)
            }
          })
        }
      })
    }
  }

  // 方法3: 遍历 model.children 找到 PIXI.Mesh（通过 geometry 属性判断）
  if (backgroundMeshes.length === 0) {
    const findMeshes = (container: any) => {
      if (!container) return
      if (container.children) {
        container.children.forEach((child: any) => {
          // PIXI v6 中 Mesh 对象有 geometry 和 shader 属性
          if (child.geometry && child._texture !== undefined) {
            const meshIdx = backgroundMeshes.length
            if (backgroundDrawableIndices.includes(meshIdx)) {
              backgroundMeshes.push(child)
            }
          }
          findMeshes(child)
        })
      }
    }
    findMeshes(model)
  }

  console.log('找到背景 mesh 数量:', backgroundMeshes.length)
}

const applyHideBackground = (hide: boolean) => {
  console.log('applyHideBackground:', hide, 'meshes:', backgroundMeshes.length, 'indices:', backgroundDrawableIndices)
  
  // 方法1: 隐藏 PIXI Mesh 对象
  if (backgroundMeshes.length > 0) {
    backgroundMeshes.forEach(mesh => {
      if (mesh) {
        mesh.visible = !hide
        mesh.renderable = !hide
        mesh.alpha = hide ? 0 : 1
      }
    })
    console.log('  ✅ 通过 mesh.visible/alpha 隐藏')
    return
  }

  // 方法2: 直接修改 CoreModel drawables opacities
  if (model?.internalModel && backgroundDrawableIndices.length > 0) {
    const coreModel = (model.internalModel as any).coreModel
    const drawables = coreModel?._model?.drawables
    if (drawables?.opacities) {
      backgroundDrawableIndices.forEach(index => {
        drawables.opacities[index] = hide ? 0 : 1
      })
      console.log('  ✅ 通过 drawables.opacities 隐藏')
      return
    }
  }
  console.log('  ⚠️ 没有找到可用的隐藏方法')
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
    backgroundColor: 0x00000000,
    backgroundAlpha: 0,
    preserveDrawingBuffer: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    transparent: true,
  })

  // 强制设置 canvas 透明
  const canvas = app.view as HTMLCanvasElement
  canvas.style.background = 'transparent'
  canvas.style.backgroundColor = 'transparent'

  canvasContainer.value.appendChild(canvas)
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

      // 在渲染循环中持续设置背景 opacities
      if (model?.internalModel && backgroundDrawableIndices.length > 0) {
        const coreModel = (model.internalModel as any).coreModel
        const drawables = coreModel?._model?.drawables
        if (drawables?.opacities) {
          const targetOpacity = props.hideBackground ? 0 : 1
          backgroundDrawableIndices.forEach(index => {
            drawables.opacities[index] = targetOpacity
          })
        }
      }
    }
  })
}

watch(() => props.hideBackground, (val) => {
  console.log('hideBackground changed to:', val, 'backgroundDrawableIndices:', backgroundDrawableIndices)
  applyHideBackground(val)
})

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
    backgroundMeshes.length = 0
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
  background: transparent;
}

.live2d-container canvas {
  width: 100% !important;
  height: 100% !important;
  background: transparent;
}

.live2d-container.hide-background {
  background: transparent !important;
}

.live2d-container.hide-background canvas {
  background: transparent !important;
}
</style>
