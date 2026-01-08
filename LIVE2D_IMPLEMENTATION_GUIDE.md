# Live2D 桌面端实现指南

## 概述

本文档详细说明了AIRI项目中Live2D模型在桌面端（Electron）的实现机制，以及复刻该功能所需的最小化依赖和核心实现要点。

---

## 一、核心技术栈

### 1.1 必需的第三方包

#### 核心依赖（最小化清单）
```json
{
  "dependencies": {
    // Live2D核心库
    "pixi-live2d-display": "^0.4.0",
    
    // Pixi.js渲染引擎（v6.x系列）
    "@pixi/app": "6.5.10",
    "@pixi/core": "6.5.10",
    "@pixi/display": "6.5.10",
    "@pixi/sprite": "6.5.10",
    "@pixi/ticker": "6.5.10",
    "@pixi/extensions": "6.5.10",
    
    // 前端框架（可选，可用其他框架替代）
    "vue": "^3.5.x",
    "pinia": "^3.0.x",
    
    // 工具库
    "jszip": "^3.10.1",        // ZIP文件处理
    "pixi-filters": "^4.0.0"   // Pixi滤镜效果（可选）
  }
}
```

#### 如果使用Electron
```json
{
  "devDependencies": {
    "electron": "latest",
    "electron-vite": "latest",
    "vite": "latest"
  }
}
```

---

## 二、实现架构

### 2.1 三层组件结构

```
Live2D.vue (容器组件)
  └─ Canvas.vue (Pixi应用管理)
      └─ Model.vue (Live2D模型管理)
```

#### 职责划分：
1. **Live2D.vue**: 状态协调、参数传递
2. **Canvas.vue**: Pixi应用初始化、Canvas渲染
3. **Model.vue**: 模型加载、动画控制、参数更新

---

## 三、核心实现步骤

### 3.1 Canvas层：Pixi应用初始化

```typescript
import { Application } from '@pixi/app'
import { extensions } from '@pixi/extensions'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

// 1. 注册必要的插件
Live2DModel.registerTicker(Ticker)
extensions.add(TickerPlugin)

// 2. 创建Pixi应用
const app = new Application({
  width: window.innerWidth * 2,      // 使用高分辨率
  height: window.innerHeight * 2,
  backgroundAlpha: 0,                // 透明背景
  preserveDrawingBuffer: true,       // 支持截图
  autoDensity: false,
  resolution: 1,
})

// 3. 设置缩放以适配高分辨率
app.stage.scale.set(2)

// 4. 将Canvas添加到DOM
document.body.appendChild(app.view)
```

**关键点**：
- 使用高分辨率渲染（width/height * resolution）
- 透明背景便于叠加其他UI
- `preserveDrawingBuffer: true` 支持Canvas截图功能

---

### 3.2 Model层：Live2D模型加载

```typescript
import { Live2DModel, Live2DFactory } from 'pixi-live2d-display/cubism4'

// 1. 创建Live2D模型实例
const model = new Live2DModel()

// 2. 加载模型文件（支持.model3.json或.zip）
await Live2DFactory.setupLive2DModel(
  model, 
  { 
    url: 'path/to/model.model3.json',  // 或 model.zip
    id: 'unique-model-id' 
  },
  { autoInteract: false }  // 禁用自动交互，手动控制
)

// 3. 添加到舞台
app.stage.addChild(model)

// 4. 设置锚点和位置
model.anchor.set(0.5, 0.5)  // 中心锚点
model.x = app.screen.width / 2
model.y = app.screen.height
```

**支持的模型格式**：
- `.model3.json` - Cubism 4.x标准格式
- `.zip` - 包含所有资源的压缩包

---

### 3.3 动画控制系统

#### 3.3.1 播放内置动画
```typescript
// 播放指定动画组的动画
await model.motion('Idle', 0)  // 播放Idle组的第0个动画
await model.motion('tap_body') // 播放tap_body动画

// 使用优先级强制播放
import { MotionPriority } from 'pixi-live2d-display/cubism4'
await model.motion('emotion_happy', 0, MotionPriority.FORCE)
```

#### 3.3.2 参数控制（重要）
Live2D模型通过参数控制面部表情、身体姿态：

```typescript
const coreModel = model.internalModel.coreModel

// 头部旋转
coreModel.setParameterValueById('ParamAngleX', 10)   // -30 到 30
coreModel.setParameterValueById('ParamAngleY', -5)   // -30 到 30
coreModel.setParameterValueById('ParamAngleZ', 0)    // -30 到 30

// 眼睛控制
coreModel.setParameterValueById('ParamEyeLOpen', 1)  // 左眼 0-1
coreModel.setParameterValueById('ParamEyeROpen', 1)  // 右眼 0-1
coreModel.setParameterValueById('ParamEyeBallX', 0)  // 眼球X -1到1
coreModel.setParameterValueById('ParamEyeBallY', 0)  // 眼球Y -1到1

// 嘴巴控制（TTS口型同步）
coreModel.setParameterValueById('ParamMouthOpenY', 0.5)  // 0-1
coreModel.setParameterValueById('ParamMouthForm', 0)     // -1到1

// 眉毛
coreModel.setParameterValueById('ParamBrowLY', 0)   // 左眉高度
coreModel.setParameterValueById('ParamBrowRY', 0)   // 右眉高度

// 身体姿态
coreModel.setParameterValueById('ParamBodyAngleX', 0)
coreModel.setParameterValueById('ParamBodyAngleY', 0)
coreModel.setParameterValueById('ParamBodyAngleZ', 0)

// 呼吸效果
coreModel.setParameterValueById('ParamBreath', 0.5)
```

**常用参数映射表**：
| 参数ID | 说明 | 取值范围 |
|--------|------|----------|
| ParamAngleX/Y/Z | 头部三轴旋转 | -30 ~ 30 |
| ParamEyeLOpen/ROpen | 左右眼睁开度 | 0 ~ 1 |
| ParamEyeBallX/Y | 眼球位置 | -1 ~ 1 |
| ParamMouthOpenY | 嘴巴张开度 | 0 ~ 1 |
| ParamBrowLY/RY | 左右眉毛高度 | -1 ~ 1 |
| ParamBodyAngleX/Y/Z | 身体三轴旋转 | -10 ~ 10 |

---

### 3.4 自动眨眼实现

Live2D模型可能自带眨眼功能，但也可以手动实现：

```typescript
// 方式1：使用内置eyeBlink
const eyeBlink = model.internalModel.eyeBlink
if (eyeBlink) {
  // 在更新循环中调用
  eyeBlink.updateParameters(coreModel, deltaTime)
}

// 方式2：自定义眨眼逻辑（AIRI实现方式）
const blinkState = {
  phase: 'idle',  // idle | closing | opening
  progress: 0,
  delayMs: 3000 + Math.random() * 5000  // 随机间隔
}

function updateBlink(deltaTime) {
  if (blinkState.phase === 'idle') {
    blinkState.delayMs -= deltaTime
    if (blinkState.delayMs <= 0) {
      blinkState.phase = 'closing'
      blinkState.progress = 0
    }
  } else if (blinkState.phase === 'closing') {
    blinkState.progress += deltaTime / 200  // 200ms闭眼
    const eyeOpen = 1 - Math.pow(blinkState.progress, 2)  // easeOut
    coreModel.setParameterValueById('ParamEyeLOpen', eyeOpen)
    coreModel.setParameterValueById('ParamEyeROpen', eyeOpen)
    
    if (blinkState.progress >= 1) {
      blinkState.phase = 'opening'
      blinkState.progress = 0
    }
  } else if (blinkState.phase === 'opening') {
    blinkState.progress += deltaTime / 200  // 200ms睁眼
    const eyeOpen = Math.pow(blinkState.progress, 2)  // easeIn
    coreModel.setParameterValueById('ParamEyeLOpen', eyeOpen)
    coreModel.setParameterValueById('ParamEyeROpen', eyeOpen)
    
    if (blinkState.progress >= 1) {
      blinkState.phase = 'idle'
      blinkState.delayMs = 3000 + Math.random() * 5000
    }
  }
}
```

---

### 3.5 视线跟随（Focus）

```typescript
// 让模型看向某个坐标
model.focus(x, y)

// 手动实现视线跟随逻辑
function updateEyeFocus(targetX, targetY) {
  const modelX = model.x
  const modelY = model.y
  
  // 计算相对位置
  const deltaX = targetX - modelX
  const deltaY = targetY - modelY
  
  // 转换为参数值（需要归一化）
  const eyeBallX = Math.max(-1, Math.min(1, deltaX / 500))
  const eyeBallY = Math.max(-1, Math.min(1, -deltaY / 500))
  
  coreModel.setParameterValueById('ParamEyeBallX', eyeBallX)
  coreModel.setParameterValueById('ParamEyeBallY', eyeBallY)
}
```

---

### 3.6 渲染循环

```typescript
let lastTime = 0

app.ticker.add((delta) => {
  const now = Date.now()
  const deltaTime = now - lastTime
  lastTime = now
  
  // 更新自定义逻辑
  updateBlink(deltaTime)
  updateEyeFocus(mouseX, mouseY)
  
  // Pixi会自动调用render
})
```

---

## 四、高级功能

### 4.1 TTS口型同步

```typescript
// 从音频分析中获取音量数据
function updateMouthFromAudio(volume) {
  // volume范围通常是0-1
  const mouthOpen = Math.max(0, Math.min(1, volume * 2))
  coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen)
}
```

### 4.2 情绪表情系统

```typescript
const emotions = {
  neutral: { group: 'Idle', index: 0 },
  happy: { group: 'emotion_happy', index: 0 },
  sad: { group: 'emotion_sad', index: 0 },
  angry: { group: 'emotion_angry', index: 0 },
}

async function setEmotion(emotion) {
  const motion = emotions[emotion]
  if (motion) {
    await model.motion(motion.group, motion.index, MotionPriority.FORCE)
  }
}
```

### 4.3 Beat Sync（节拍同步）

AIRI实现了一个节拍同步系统，让模型随音乐节拍摆动：

```typescript
// 使用弹簧物理模拟平滑过渡
const spring = {
  stiffness: 120,
  damping: 16,
  mass: 1,
  velocity: 0,
  position: 0,
  target: 0
}

function updateSpring(deltaTime) {
  const accel = (spring.stiffness * (spring.target - spring.position) 
                 - spring.damping * spring.velocity) / spring.mass
  spring.velocity += accel * deltaTime
  spring.position += spring.velocity * deltaTime
  
  // 应用到角度参数
  coreModel.setParameterValueById('ParamAngleX', spring.position)
}

// 在节拍点设置新目标
function onBeat() {
  spring.target = Math.sin(Date.now() / 1000) * 10
}
```

### 4.4 阴影效果

```typescript
import { DropShadowFilter } from 'pixi-filters'

const shadowFilter = new DropShadowFilter({
  alpha: 0.2,
  blur: 0,
  distance: 20,
  rotation: 45,
  color: 0x000000
})

model.filters = [shadowFilter]
```

---

## 五、状态管理（可选）

使用Pinia进行全局状态管理：

```typescript
import { defineStore } from 'pinia'

export const useLive2dStore = defineStore('live2d', () => {
  // 模型位置
  const position = ref({ x: 0, y: 0 })
  
  // 当前动画
  const currentMotion = ref({ group: 'Idle', index: 0 })
  
  // 模型参数
  const modelParameters = ref({
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    leftEyeOpen: 1,
    rightEyeOpen: 1,
    mouthOpen: 0,
    // ...更多参数
  })
  
  // 缩放
  const scale = ref(1)
  
  return {
    position,
    currentMotion,
    modelParameters,
    scale
  }
})
```

---

## 六、性能优化建议

1. **高分辨率渲染**：使用2倍分辨率，CSS缩放到100%
2. **按需更新**：只在参数变化时更新模型
3. **防抖处理**：窗口resize时使用防抖
4. **错误处理**：包装渲染循环防止崩溃
5. **资源预加载**：提前加载模型文件避免卡顿

```typescript
// 渲染守卫示例
function installRenderGuard(app) {
  const guardedRender = () => {
    try {
      app.render()
    } catch (error) {
      console.error('Render error:', error)
      app.ticker.stop()
    }
  }
  
  app.ticker.remove(app.render, app)
  app.ticker.add(guardedRender)
}
```

---

## 七、完整最小示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>Live2D Demo</title>
  <style>
    body { margin: 0; overflow: hidden; }
    #canvas { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="canvas"></div>
  
  <script type="module">
    import { Application } from '@pixi/app'
    import { Ticker, TickerPlugin } from '@pixi/ticker'
    import { extensions } from '@pixi/extensions'
    import { Live2DModel, Live2DFactory } from 'pixi-live2d-display/cubism4'
    
    // 1. 注册插件
    Live2DModel.registerTicker(Ticker)
    extensions.add(TickerPlugin)
    
    // 2. 创建应用
    const app = new Application({
      width: window.innerWidth * 2,
      height: window.innerHeight * 2,
      backgroundAlpha: 0,
      resolution: 1,
    })
    app.stage.scale.set(2)
    document.getElementById('canvas').appendChild(app.view)
    
    // 3. 加载模型
    const model = new Live2DModel()
    await Live2DFactory.setupLive2DModel(
      model,
      { url: 'path/to/model.model3.json' },
      { autoInteract: false }
    )
    
    // 4. 添加到舞台
    app.stage.addChild(model)
    model.anchor.set(0.5, 0.5)
    model.x = app.screen.width / 4
    model.y = app.screen.height / 2
    
    // 5. 播放动画
    await model.motion('Idle', 0)
    
    // 6. 鼠标跟随
    window.addEventListener('mousemove', (e) => {
      model.focus(e.clientX * 2, e.clientY * 2)
    })
  </script>
</body>
</html>
```

---

## 八、常见问题

### Q1: 模型加载失败？
- 检查模型文件路径是否正确
- 确保`.model3.json`文件和相关资源在同一目录
- 检查CORS设置（如果从远程加载）

### Q2: 模型显示异常（无头/变形）？
- 确保scale不为0或NaN
- 检查分辨率设置是否正确
- 验证stage.scale和model.scale设置

### Q3: 动画不播放？
- 检查模型是否包含对应的动画组
- 确认motionManager是否正确初始化
- 查看控制台是否有错误

### Q4: 如何支持ZIP格式？
- 安装jszip: `npm install jszip`
- 在项目入口导入ZIP loader：
  ```typescript
  import 'pixi-live2d-display/cubism4/zip'
  ```

---

## 九、总结

### 核心依赖总结
最小化实现仅需3个核心包：
1. **pixi-live2d-display** - Live2D核心
2. **@pixi系列** - 渲染引擎
3. **jszip** - ZIP支持（可选）

### 核心功能点
1. ✅ Pixi应用初始化
2. ✅ Live2D模型加载
3. ✅ 动画播放控制
4. ✅ 参数动态控制
5. ✅ 自动眨眼
6. ✅ 视线跟随
7. ✅ TTS口型同步（可选）
8. ✅ 情绪表情系统（可选）
9. ✅ 节拍同步（可选）

### 开发建议
- 从最小示例开始，逐步添加功能
- 使用TypeScript获得更好的类型提示
- 参考pixi-live2d-display官方文档
- 善用浏览器DevTools调试渲染问题

---

## 参考资源

- [pixi-live2d-display GitHub](https://github.com/guansss/pixi-live2d-display)
- [Pixi.js 官方文档](https://pixijs.com/)
- [Live2D Cubism SDK](https://www.live2d.com/en/sdk/)
- [AIRI项目源码](https://github.com/moeru-ai/airi)
