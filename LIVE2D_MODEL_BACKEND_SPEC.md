# Live2D 模型后端化改造对接文档

> **文档版本**: v2.0（前端改造已完成 + 移动端 App 打包支持）
> **最后更新**: 2026-05-19
> **状态**: ✅ 前端改造全部完成，后端 API 已就绪

---

## 1. 架构总览

### 1.1 当前架构（后端管理模型 + 前端降级兜底）

```
┌─────────────────────────────────────────────────────┐
│                    前端 (Vue 3)                       │
│                                                      │
│  App.vue                                            │
│    ├─ onMounted → live2dModelService.list()  ──┐   │
│    │         (GET /api/live2d-model/list)       │   │
│    ├─ discoveredModels (computed)               │   │
│    │   ├─ remoteModels.length > 0?              │   │
│    │   │   ✅ 使用远程模型列表（modelUrl 直指后端）│   │
│    │   │                                          │   │
│    │   └─ 否？降级到 auto-models.ts 本地配置     │   │
│    └─ Live2DModel.vue                             │
│        └─ Live2DModel.from(modelUrl, {           │
│             motionPreload: MotionPreloadStrategy.ALL│
│           })                                      │
│            ↓ 自动解析 .model3.json 相对路径          │
│            ↓ fetch .moc3 / .png / .motion3.json    │
└─────────────────────────────────────────────────────┘
                    ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────┐
│                   后端服务                           │
│                                                      │
│  GET  /api/live2d-model/list      模型列表 API       │
│  POST /api/live2d-model/upload    上传 ZIP 包       │
│  DELETE /api/live2d-model/{id}    删除模型          │
│  GET  /model/{id}/*               静态文件服务       │
│                                                      │
│  {MODEL_STORAGE_PATH}/                                │
│    chitose/chitose.model3.json                        │
│    chitose/chitose.moc3                               │
│    my_model/my_model.model3.json                      ← 用户上传的模型
│    ...                                                │
└─────────────────────────────────────────────────────┘
```

### 1.2 部署形态

| 形态 | 入口 | 说明 |
|------|------|------|
| **Web 端** | `npm run build` → `dist/` | 部署到 Nginx/CDN，通过浏览器访问 |
| **Electron 桌面端** | `npm run electron:build` | Windows `.exe` / Mac `.dmg` |
| **移动端 App** | `npm run cap:sync` → Android Studio / Xcode | iOS `IPA` + Android `APK/AAB` |

---

## 2. 已完成的文件清单

### 2.1 新增文件

| 文件 | 用途 |
|------|------|
| [src/services/live2dModelService.ts](src/services/live2dModelService.ts) | 模型列表/上传/删除 API 服务（含 5 分钟降级缓存） |
| [src/components/Live2DModelManager.vue](src/components/Live2DModelManager.vue) | 模型管理 UI（列表展示 + ZIP 上传 + 删除） |
| [src/utils/capacitor.ts](src/utils/capacitor.ts) | Capacitor 原生桥接层（状态栏/启动屏/安全区域/返回键） |
| [capacitor.config.ts](capacitor.config.ts) | Capacitor 配置（App ID、插件、平台设置） |
| [android/](android/) | Android 原生项目（Gradle） |
| [ios/](ios/) | iOS 原生项目（Xcode/Swift） |

### 2.2 修改文件

| 文件 | 改动内容 |
|------|----------|
| [src/App.vue](src/App.vue) | `discoveredModels` 改为远程优先+本地降级；新增 `Live2DModelManager` 组件和入口；原生 App 安全区域适配 |
| [src/components/Live2DModel.vue](src/components/Live2DModel.vue) | `motionPreload: MotionPreloadStrategy.ALL` 全量预加载；`model.destroy({children, texture, baseTexture})` 完整释放 WebGL 资源 |
| [src/main.ts](src/main.ts) | 启动时调用 `initCapacitor()` 初始化原生桥接 |
| [src/config/index.ts](src/config/index.ts) | 原生 App 自动使用生产环境 API 地址 (`https://shiwu.shop`) |
| [vite.config.ts](vite.config.ts) | 新增 `/model` 代理规则（开发环境） |
| [package.json](package.json) | 新增 8 个 Capacitor 打包脚本；新增 Capacitor 依赖 |

### 2.3 未修改的文件（保留原样）

| 文件 | 说明 |
|------|------|
| `src/config/auto-models.ts` | 作为**本地降级兜底**保留，API 不可用时自动启用 |
| `public/model/` | 本地模型资源仍保留，用于开发调试和降级场景 |
| `scripts/scan-models.js` | 扫描脚本仍可用，用于维护本地默认模型 |

---

## 3. 后端 API 接口规范

> ⚠️ 以下接口由后端实现，前端已完成对接。

### 3.1 模型列表

```
GET /api/live2d-model/list

Response:
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "id": "chitose",
      "name": "Chitose",
      "modelUrl": "https://shiwu.shop/model/chitose/chitose.model3.json",
      "previewImage": "https://shiwu.shop/model/chitose/chitose.1024/texture_00.png",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "fileSize": 15728640,        // 可选：文件大小（字节）
      "fileCount": 12              // 可选：文件数量
    }
  ]
}
```

### 3.2 模型上传

```
POST /api/live2d-model/upload
Content-Type: multipart/form-data

参数:
  file:  File     (必需) 模型 zip 压缩包
  name:  string   (可选) 自定义显示名称

Response:
{
  "code": 200,
  "msg": "上传成功",
  "data": {
    "id": "my_model",
    "name": "My Model",
    "modelUrl": "https://shiwu.shop/model/my_model/my_model.model3.json",
    "previewImage": "...",
    "fileSize": 15728640,
    "fileCount": 12
  }
}
```

### 3.3 删除模型

```
DELETE /api/live2d-model/{modelId}

Response: { "code": 200, "msg": "删除成功" }

注意: isDefault=true 的系统默认模型不允许删除。
```

### 3.4 静态文件服务

```
GET /model/{modelId}/{...path}

示例:
  GET /model/chitose/chitose.model3.json
  GET /model/chitose/chitose.moc3
  GET /model/chitose/chitose.1024/texture_00.png
  GET /model/chitose/expressions/Angry.exp3.json
```

**CORS:** `Access-Control-Allow-Origin: *`

**缓存策略:**
- `.moc3`, `.png`, `.jpg`, `.webp`: `Cache-Control: public, max-age=31536000, immutable`
- `.json`: `Cache-Control: public, max-age=3600`

---

## 4. 模型上传校验规则

### 4.1 必需文件

- 至少一个 `*.model3.json` 入口文件
- `FileReferences.Moc` 引用的 `.moc3` 存在
- `FileReferences.Textures` 所有纹理存在

### 4.2 可选文件

`.physics3.json`, `.cdi3.json`, `expressions/*.exp3.json`, `motion/*.motion3.json`, `.pose3.json`

### 4.3 安全限制

- 只允许: `.json`, `.moc3`, `.png`, `.jpg`, `.jpeg`, `.webp`
- zip 炸弹防护（解压前检查总大小）
- 单个模型上限建议 100MB

### 4.4 路径处理策略（重要）

解压 zip 后，**以 `.model3.json` 所在目录为根**，保持完整子目录结构：

```
输入: my_model.zip 解压后
  my_model/runtime/my_model.model3.json    ← 入口文件
  my_model/runtime/my_model.moc3
  my_model/runtime/my_model.1024/texture_00.png
  my_model/runtime/expressions/Smile.exp3.json
  my_model/runtime/motion/idle_01.motion3.json

存储为: {MODEL_STORAGE_PATH}/my_model/
  my_model.model3.json        ← 以 model3.json 所在目录为根，去掉外层包裹
  my_model.moc3
  my_model.1024/texture_00.png
  expressions/Smile.exp3.json
  motion/idle_01.motion3.json
```

---

## 5. 前端核心逻辑详解

### 5.1 模型加载流程（远程优先 + 本地降级）

```typescript
// src/App.vue 核心逻辑

const remoteModels = ref<Live2DModelInfo[]>([])

const discoveredModels = computed<ModelInfo[]>(() => {
  // 远程模型优先
  if (remoteModels.value.length > 0) {
    return remoteModels.value.map(m => ({
      id: m.id,
      name: m.name,
      path: m.modelUrl,       // 直接用后端 URL
      isValid: true
    }))
  }
  // 降级：API 不可用时使用本地 auto-models.ts
  const validIds = getValidAutoModelIds()
  return validIds.map(id => ({
    id,
    name: autoModelConfig[id]?.name || id,
    path: autoModelConfig[id]?.path || '',
    isValid: autoModelConfig[id]?.exists ?? false
  }))
})

onMounted(async () => {
  // 尝试获取远程模型列表
  try {
    const models = await live2dModelService.list()
    if (models.length > 0) {
      remoteModels.value = models
      initializeDefaultModel()  // 重新选择默认模型
    }
  } catch {
    console.warn('远程模型列表获取失败，使用本地模型')
  }
})
```

### 5.2 API 可用性缓存（避免重复超时）

```typescript
// src/services/live2dModelService.ts
let apiAvailable: boolean | null = null
let lastCheckTime = 0
const CHECK_INTERVAL = 5 * 60 * 1000  // 5 分钟

async list(): Promise<Live2DModelInfo[]> {
  const now = Date.now()
  if (apiAvailable === false && now - lastCheckTime < CHECK_INTERVAL) {
    return []  // 缓存期内的失败直接返回空数组，不发起请求
  }
  try { /* ... */ apiAvailable = true; return data }
  catch { apiAvailable = false; lastCheckTime = now; return [] }
}
```

### 5.3 Pixi 模型加载优化

```typescript
// src/components/Live2DModel.vue
const { Live2DModel, MotionPreloadStrategy } = await import('pixi-live2d-display/cubism4')

model = await Live2DModel.from(props.modelPath, {
  autoInteract: false,
  motionPreload: MotionPreloadStrategy.ALL  // 全量预加载所有动作组
})
```

切换模型时完整释放 WebGL 资源：

```typescript
watch(() => props.modelPath, async () => {
  if (model && app) {
    app.stage.removeChild(model)
    model.destroy({
      children: true,
      texture: true,       // 释放纹理
      baseTexture: true    // 释放基础纹理
    })
    model = null
    await loadModel()
  }
})
```

### 5.4 原生 App 环境适配

```typescript
// src/utils/capacitor.ts
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { App } from '@capacitor/app'

export const isNativeApp = Capacitor.isNativePlatform()

export async function initCapacitor(): Promise<void> {
  if (!isNativeApp) return

  await StatusBar.setStyle({ style: Style.Light })
  await SplashScreen.hide()

  // Android 返回键处理
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) App.exitApp()
    else window.history.back()
  })

  // iOS 安全区适配
  document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)')
}

// src/config/index.ts — 原生 App 自动走生产环境地址
function getCurrentEnvironment(): Environment {
  if (isNativeApp) return 'production'  // 原生 App 不走 Vite 代理
  // ...
}
```

---

## 6. Nginx 生产环境配置参考

```nginx
# API 代理
location /api/ {
    proxy_pass http://backend:8080;
}

# 模型静态文件（长缓存）
location /model/ {
    alias /data/live2d-models/;
    add_header Access-Control-Allow-Origin *;

    # 二进制文件：1 年缓存
    location ~* \.(moc3|png|jpg|jpeg|webp)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    # JSON 文件：1 小时缓存（可能更新）
    location ~* \.json$ {
        add_header Cache-Control "public, max-age=3600";
    }
}

# 前端 SPA
location /live2d/ {
    alias /app/live2d/dist/;
    try_files $uri $uri/ /live2d/index.html;
}
```

---

## 7. 数据库表设计参考

```sql
CREATE TABLE live2d_models (
    id          VARCHAR(64)  PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,
    model_url   VARCHAR(512) NOT NULL,
    preview_url VARCHAR(512),
    owner_id    VARCHAR(64),
    is_default  BOOLEAN DEFAULT FALSE,
    file_size   BIGINT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. 开发与打包命令速查

```bash
# ========== Web 端 ==========
npm run dev                # Vite 开发服务器（端口 5173）
npm run build              # 构建 Web 版本 → dist/

# ========== Electron 桌面端 ==========
npm run electron:dev       # 开发模式（Vite + Electron 热更新）
npm run electron:build     # 打包桌面应用 → release/

# ========== 移动端 (Capacitor) ==========
npm run cap:build          # 构建 Web 资源（同 npm run build）
npm run cap:sync           # 构建 + 同步到 android/ ios 目录
npm run cap:run:android    # 同步并在 Android 设备上运行
npm run cap:run:ios        # 同步并在 iOS 设备上运行
npm run cap:open:android   # 用 Android Studio 打开项目
npm run cap:open:ios       # 用 Xcode 打开项目

# ========== 模型扫描 ==========
npm run scan-models        # 扫描 public/model/ 更新 auto-models.ts
```

---

## 9. 技术要点备忘

### 9.1 渲染架构（100% 本地渲染）

```
阶段一：初始化（网络请求，仅一次）
  Live2DModel.from("https://后端/model/chitose/model3.json")
    → fetch .model3.json + .moc3 + 纹理 + 物理 + Idle 动作
  ✅ 之后模型完全在浏览器 WebGL 内存中

阶段二：运行动画（零网络请求）
  model.motion('Tap', 0)   → 从内存读取，0ms 延迟
  model.expression('Smile') → 从内存读取，0ms 延迟
  眨眼/呼吸/物理/鼠标跟踪   → 每帧本地计算
```

### 9.2 动作预加载策略

| 策略 | 行为 | 适用场景 |
|------|------|---------|
| `IDLE`（默认） | 只预加载 Idle 组 | 模型在本地时够用 |
| **`ALL`（当前）** | 预加载**所有动作组** | **模型在后端时必须**，避免首次播放延迟 |
| `NONE` | 不预加载 | 特殊需求 |

### 9.3 多端 API 地址策略

| 运行环境 | API Base URL | WebSocket URL |
|----------|-------------|---------------|
| Web 开发 | `""`（Vite 代理 → localhost:8080） | `ws://localhost:8080` |
| Web 生产 | `https://shiwu.shop` | `wss://shiwu.shop` |
| **Electron** | `https://shiwu.shop` | `wss://shiwu.shop` |
| **Capacitor App** | `https://shiwu.shop` | `wss://shiwu.shop` |

### 9.4 降级机制

当后端 API 不可达时：
1. `live2dModelService.list()` 失败 → 返回空数组
2. `discoveredModels` computed 自动降级到 `auto-models.ts` 本地模型
3. API 失败状态缓存 5 分钟，期间不重复请求
4. 用户可正常使用本地预置的 7 个模型

---

## 10. 改造进度追踪

| 优先级 | 改造项 | 状态 | 备注 |
|-------|--------|------|------|
| P0 | 后端：模型列表 API + 静态文件服务 | ✅ 已完成 | 由后端实现 |
| P0 | 前端：`discoveredModels` 远程优先+本地降级 | ✅ 已完成 | 含 5 分钟 API 缓存 |
| P0 | 前端：`motionPreload: ALL` | ✅ 已完成 | 使用枚举值 `MotionPreloadStrategy.ALL` |
| P1 | 后端：模型上传 API | ✅ 已完成 | ZIP 校验 + 目录结构保持 |
| P1 | 前端：模型管理 UI（上传/删除/列表） | ✅ 已完成 | `Live2DModelManager.vue` |
| P1 | 前端：降级策略 | ✅ 已完成 | API 不可用时自动降级 |
| P2 | 后端：模型删除 API | ✅ 已完成 | 默认模型保护 |
| P2 | 前端：模型切换资源释放 | ✅ 已完成 | `{children, texture, baseTexture}` |
| P2 | 前端：Vite `/model` 代理 | ✅ 已完成 | 开发环境代理到后端 |
| P3 | 后端：预览图提取 | ✅ 已完成 | 上传响应含 previewImage |
| P3 | Nginx 缓存策略 | ✅ 已配置 | 见第 6 节 |
| **—** | **移动端 App (Capacitor)** | **✅ 已完成** | **iOS + Android 双平台** |
