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
import { getModelDisplayConfig } from '../config/display'


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

const emit = defineEmits<{
  loaded: []
  error: [error: Error]
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

// 收集 PIXI 场景图中所有 Mesh 对象（平铺遍历，不预先绑定 drawable 索引）
const allSceneMeshes: any[] = []

const collectAllSceneMeshes = () => {
  allSceneMeshes.length = 0
  if (!model) return

  const walk = (node: any, depth: number, path: string) => {
    if (!node) return
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, i: number) => {
        const childPath = `${path}/${i}`
        // PIXI Mesh 的判断：有 geometry 属性
        if (child.geometry && child.visible !== undefined) {
          allSceneMeshes.push({ mesh: child, depth, path: childPath, childIndex: i })
        }
        // 无论是否为 Mesh，都继续递归（Container 也可能包含子节点）
        walk(child, depth + 1, childPath)
      })
    }
  }
  walk(model, 0, 'root')
}

const identifyBackgroundDrawables = () => {
  backgroundDrawableIndices = []
  backgroundMeshes.length = 0
  if (!model?.internalModel) return

  // 首先收集场景图中所有 Mesh
  collectAllSceneMeshes()

  const coreModel = (model.internalModel as any).coreModel
  const drawables = coreModel?._model?.drawables
  if (!drawables?.renderOrders) {
    // 没有 drawable 数据时，用场景图中深度最大的 mesh 作为背景候选
    if (allSceneMeshes.length > 0) {
      const sorted = [...allSceneMeshes].sort((a, b) => b.depth - a.depth)
      const candidates = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3)))
      candidates.forEach(item => backgroundMeshes.push(item.mesh))
    }
    return
  }

  const renderOrders: number[] = Array.from(drawables.renderOrders as Float32Array)

  const textureUrls: string[] = []
  try {
    const settings = (model.internalModel as any).settings
    if (settings?.textures) {
      settings.textures.forEach((t: any) => textureUrls.push(String(t || '')))
    }
  } catch { /* ignore */ }

  // 策略1: 纹理名匹配关键词
  const bgTextureSet = new Set<number>()
  textureUrls.forEach((url, idx) => {
    const lower = url.toLowerCase()
    if (/background|_bg_|_bg\.|bg_|back_|haikei|scene|stage/i.test(lower)) {
      bgTextureSet.add(idx)
    }
  })

  if (bgTextureSet.size > 0) {
    const textures = drawables.textureIndexes as Int16Array | undefined
    if (textures) {
      Array.from(textures).forEach((texIdx, drawIdx) => {
        if (bgTextureSet.has(texIdx)) backgroundDrawableIndices.push(drawIdx)
      })
    }
    console.log('✅ 背景检测(纹理名) - 索引:', backgroundDrawableIndices)
  }

  // 策略2: 基于场景图 — 大面积 mesh 通常是背景
  if (backgroundDrawableIndices.length === 0 && allSceneMeshes.length > 0) {
    const canvasW = app?.screen.width ?? 0
    const canvasH = app?.screen.height ?? 0
    const totalArea = canvasW * canvasH

    const meshInfos: Array<{ idx: number; areaRatio: number; depth: number; path: string }> = []
    allSceneMeshes.forEach((item, idx) => {
      const m = item.mesh
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      try {
        const posBuf = m.geometry?.getBuffer('aVertexPosition')
        if (posBuf?.data) {
          const arr = posBuf.data as Float32Array
          for (let i = 0; i < arr.length; i += 2) {
            const vx = arr[i] as number
            const vy = arr[i + 1] as number
            if (vx !== undefined && vy !== undefined) {
              if (vx < minX) minX = vx
              if (vx > maxX) maxX = vx
              if (vy < minY) minY = vy
              if (vy > maxY) maxY = vy
            }
          }
        }
      } catch { /* skip malformed geometry */ }
      const w = maxX - minX
      const h = maxY - minY
      const area = w * h
      const areaRatio = totalArea > 0 ? area / totalArea : 0
      if (area > 0) {
        meshInfos.push({ idx, areaRatio, depth: item.depth, path: item.path })
      }
    })

    console.log('📐 Mesh 包围盒分析 (前10):',
      meshInfos.slice(0, 10).map(i => ({
        idx: i.idx, areaRatio: (i.areaRatio * 100).toFixed(1) + '%',
        depth: i.depth, path: i.path
      }))
    )

    // 背景 mesh 覆盖面积大（>40%画布）
    meshInfos.forEach(info => {
      if (info.areaRatio > 0.4) {
        backgroundMeshes.push(allSceneMeshes[info.idx].mesh)
      }
    })

    if (backgroundMeshes.length > 0) {
      console.log('✅ 背景检测(大面积Mesh) - 数量:', backgroundMeshes.length)
    }
  }

  // 策略3: renderOrder 最低的 drawable
  if (backgroundDrawableIndices.length === 0 && backgroundMeshes.length === 0) {
    const minOrder = Math.min(...renderOrders)
    renderOrders.forEach((order, index) => {
      if (order === minOrder) backgroundDrawableIndices.push(index)
    })
  }

  // 策略4: renderOrder 最低的 20%
  if (backgroundDrawableIndices.length === 0 && backgroundMeshes.length === 0) {
    const sorted = renderOrders.map((order, idx) => ({ order, idx })).sort((a, b) => a.order - b.order)
    const cutoff = Math.max(1, Math.floor(renderOrders.length * 0.2))
    sorted.slice(0, cutoff).forEach(({ idx }) => backgroundDrawableIndices.push(idx))
  }

  // 如果在场景图中找到了 backgroundMeshes，直接使用
  if (backgroundMeshes.length > 0) {
    console.log('🎯 背景检测(large area meshes) - mesh数量:', backgroundMeshes.length)
    return
  }

  // 尝试通过 drawable 索引匹配 PIXI Mesh（多种途径）
  const _meshes = (model as any)._meshes
  if (_meshes && Array.isArray(_meshes)) {
    backgroundDrawableIndices.forEach(idx => {
      if (_meshes[idx]) backgroundMeshes.push(_meshes[idx])
    })
  }

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

  // 用场景图 mesh 按索引匹配
  if (backgroundMeshes.length === 0 && allSceneMeshes.length > 0) {
    backgroundDrawableIndices.forEach(idx => {
      if (idx < allSceneMeshes.length) {
        backgroundMeshes.push(allSceneMeshes[idx].mesh)
      }
    })
  }
}

const applyHideBackground = (hide: boolean) => {

  // 方法1: 直接隐藏已找到的 PIXI Mesh
  if (backgroundMeshes.length > 0) {
    backgroundMeshes.forEach(mesh => {
      if (mesh) {
        mesh.visible = !hide
        mesh.renderable = !hide
        mesh.alpha = hide ? 0 : 1
      }
    })
    console.log('  ✅ 通过 mesh.visible/alpha 隐藏了', backgroundMeshes.length, '个 mesh')
    return
  }

  // 方法2: 如果没找到特定 mesh，尝试隐藏场景图中前几个 mesh（可能是背景层）
  if (allSceneMeshes.length > 0) {
    // 隐藏深度最大的几个 mesh（它们最先被渲染，可能是背景）
    const sorted = [...allSceneMeshes].sort((a, b) => b.depth - a.depth)
    const candidates = sorted.slice(0, Math.ceil(sorted.length * 0.3))
    candidates.forEach(({ mesh }) => {
      if (mesh) {
        mesh.visible = !hide
        mesh.renderable = !hide
        mesh.alpha = hide ? 0 : 1
      }
    })
    console.log('  ✅ 通过场景图深度隐藏了', candidates.length, '个 mesh (共', allSceneMeshes.length, '个)')
    return
  }

  // 方法3: 设置 drawables opacities
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
    const { Live2DModel, MotionPreloadStrategy } = await import('pixi-live2d-display/cubism4')
    if (!tickerRegistered) {
      Live2DModel.registerTicker(Ticker)
      tickerRegistered = true
    }
    model = await Live2DModel.from(props.modelPath, {
      autoInteract: false,
      motionPreload: MotionPreloadStrategy.ALL
    })

    app.stage.addChild(model)
    model.anchor.set(0.5, 0.5)

    if (props.x !== undefined && props.y !== undefined && props.scale !== undefined) {
      model.x = props.x
      model.y = props.y
      model.scale.set(props.scale)
    } else {
      const displayCfg = getModelDisplayConfig(props.modelId)
      const containerWidth = app.screen.width
      const containerHeight = app.screen.height
      const modelWidth = model.width
      const modelHeight = model.height
      const fillRatio = displayCfg.fillRatio ?? 0.8

      let optimalScale: number
      if (displayCfg.defaultScale && displayCfg.defaultScale > 0) {
        optimalScale = displayCfg.defaultScale
        console.log('使用配置的默认缩放:', displayCfg.defaultScale)
      } else if (modelWidth > 0 && modelHeight > 0) {
        const scaleX = (containerWidth * fillRatio) / modelWidth
        const scaleY = (containerHeight * fillRatio) / modelHeight
        optimalScale = Math.min(scaleX, scaleY)

        const MIN_SCALE = 0.01
        const MAX_SCALE = 10
        if (optimalScale < MIN_SCALE) {
          console.warn(`计算的缩放过小 (${optimalScale.toFixed(6)})，使用最小值 ${MIN_SCALE}。模型尺寸: ${modelWidth}x${modelHeight}, 容器: ${containerWidth}x${containerHeight}`)
          optimalScale = MIN_SCALE
        } else if (optimalScale > MAX_SCALE) {
          console.warn(`计算的缩放过大 (${optimalScale.toFixed(6)})，使用最大值 ${MAX_SCALE}`)
          optimalScale = MAX_SCALE
        }
      } else {
        optimalScale = 1
      }

      model.scale.set(optimalScale)
      model.anchor.set(displayCfg.anchorX ?? 0.5, displayCfg.anchorY ?? 0.5)
      model.x = displayCfg.positionX === 'center' ? containerWidth / 2
        : displayCfg.positionX === 'left' ? 0
        : displayCfg.positionX === 'right' ? containerWidth
        : typeof displayCfg.positionX === 'number' ? displayCfg.positionX : containerWidth / 2
      model.y = displayCfg.positionY === 'center' ? containerHeight / 2
        : displayCfg.positionY === 'top' ? 0
        : displayCfg.positionY === 'bottom' ? containerHeight
        : typeof displayCfg.positionY === 'number' ? displayCfg.positionY : containerHeight / 2
    }

    if (model.internalModel.motionManager) {
      // 不再自动播放 idle 动作，由外部控制
    }

    adjustModelToContainer()

    identifyBackgroundDrawables()

    emit('loaded')
  } catch (error) {
    console.error('Live2D 模型加载失败:', error)
    emit('error', error instanceof Error ? error : new Error(String(error)))
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
  const displayCfg = getModelDisplayConfig(props.modelId)
  const containerWidth = app.screen.width
  const containerHeight = app.screen.height
  const baseModelWidth = model.width / model.scale.x
  const baseModelHeight = model.height / model.scale.y
  const fillRatio = displayCfg.fillRatio ?? 0.8

  let optimalScale: number
  if (displayCfg.defaultScale && displayCfg.defaultScale > 0) {
    optimalScale = displayCfg.defaultScale
  } else if (baseModelWidth > 0 && baseModelHeight > 0) {
    const scaleX = (containerWidth * fillRatio) / baseModelWidth
    const scaleY = (containerHeight * fillRatio) / baseModelHeight
    optimalScale = Math.min(scaleX, scaleY)

    const MIN_SCALE = 0.01
    const MAX_SCALE = 10
    if (optimalScale < MIN_SCALE) {
      optimalScale = MIN_SCALE
    } else if (optimalScale > MAX_SCALE) {
      optimalScale = MAX_SCALE
    }
  } else {
    optimalScale = 1
  }

  model.scale.set(optimalScale)
  model.x = displayCfg.positionX === 'center' ? containerWidth / 2
    : displayCfg.positionX === 'left' ? 0
    : displayCfg.positionX === 'right' ? containerWidth
    : typeof displayCfg.positionX === 'number' ? displayCfg.positionX : containerWidth / 2
  model.y = displayCfg.positionY === 'center' ? containerHeight / 2
    : displayCfg.positionY === 'top' ? 0
    : displayCfg.positionY === 'bottom' ? containerHeight
    : typeof displayCfg.positionY === 'number' ? displayCfg.positionY : containerHeight / 2
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

      // 每帧确保背景 mesh/opacity 保持目标状态
      if (!props.hideBackground) return

      // 保持 PIXI mesh 隐藏
      if (backgroundMeshes.length > 0) {
        backgroundMeshes.forEach(mesh => {
          if (mesh && mesh.visible !== false) {
            mesh.visible = false
            mesh.renderable = false
            mesh.alpha = 0
          }
        })
      }

      // 兜底: 保持 drawable opacities
      if (model?.internalModel && backgroundDrawableIndices.length > 0) {
        const coreModel = (model.internalModel as any).coreModel
        const drawables = coreModel?._model?.drawables
        if (drawables?.opacities) {
          backgroundDrawableIndices.forEach(index => {
            if (drawables.opacities[index] !== 0) {
              drawables.opacities[index] = 0
            }
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

  await waitForContainerReady()
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

const waitForContainerReady = (): Promise<void> => {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (!canvasContainer.value) {
        resolve()
        return
      }

      const rect = canvasContainer.value.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))

      if (width > 10 && height > 10) {
        resolve()
        return
      }

      console.log(`⏳ 等待容器就绪... 当前: ${width}x${height}`)
      requestAnimationFrame(checkReady)
    }

    setTimeout(() => {
      resolve()
    }, 5000)

    requestAnimationFrame(checkReady)
  })
}

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
  // 如果 modelPath 为空，不加载
  if (!props.modelPath) {
    console.log('[Live2D] modelPath 为空，跳过加载')
    return
  }

  // 清理旧模型（如果存在）
  if (model && app) {
    backgroundDrawableIndices = []
    backgroundMeshes.length = 0
    app.stage.removeChild(model)
    model.destroy({
      children: true,
      texture: true,
      baseTexture: true
    })
    model = null
  }

  // 确保 PIXI app 已初始化并等待容器就绪
  if (!app) {
    initPixiApp()
  }

  // 等待容器和 app 都准备好
  await waitForContainerReady()

  // 再次检查 app 是否成功初始化
  if (!app) {
    console.error('[Live2D] PIXI app 初始化失败，无法加载模型')
    emit('error', new Error('PIXI app 初始化失败'))
    return
  }

  // 加载新模型
  await loadModel()
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
