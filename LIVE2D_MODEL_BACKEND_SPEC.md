# Live2D 模型后端化改造对接文档

## 1. 当前架构（前端管理模型）

```
public/model/                    ← 模型文件存前端
  chitose/runtime/
    chitose.model3.json          ← 入口文件
    chitose.moc3                 ← 网格数据
    chitose.physics3.json        ← 物理模拟
    chitose.cdi3.json            ← 显示信息
    chitose.1024/texture_*.png   ← 纹理
    expressions/*.exp3.json      ← 表情
    motion/*.motion3.json        ← 动作

scripts/scan-models.js           ← 扫描 public/model/ 生成 auto-models.ts
src/config/auto-models.ts        ← 自动生成的模型列表（硬编码路径 + exists 标志）
```

**加载流程：**
```
App.vue → discoveredModels (from auto-models.ts)
       → Live2DModel.vue (pixi-live2d-display)
       → fetch('/live2d/model/chitose/runtime/chitose.model3.json')
       → 库自动解析 .model3.json 中 FileReferences 的相对路径
       → 逐个 fetch 拉取 .moc3 / .png / .physics3.json / .motion3.json
```

**现状问题：**
- 新增模型需手动放文件夹 + 运行 `npm run scan-models`
- 不支持用户运行时上传模型
- 模型打包在前端，增加部署体积

---

## 2. 目标架构（后端管理模型）

```
后端存储:
  {MODEL_STORAGE_PATH}/
    chitose/
      chitose.model3.json
      chitose.moc3
      ...

前端:
  从 API 获取模型列表 → 模型 path 指向后端 URL → pixi-live2d-display 自动拉取
```

---

## 3. 后端需要实现的 API

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
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 模型唯一标识，建议用目录名（字母数字下划线） |
| name | string | 显示名称 |
| modelUrl | string | .model3.json 入口文件的完整 URL |
| previewImage | string | 预览图 URL（取第一张纹理），可选 |
| isDefault | bool | 是否为系统默认模型（不可删除） |
| createdAt | string | 创建时间 |

### 3.2 模型上传

```
POST /api/live2d-model/upload
Content-Type: multipart/form-data

参数:
  file:  File     (必需) 模型 zip 压缩包
  name:  string   (可选) 自定义显示名称，不传则自动从目录名生成

Response:
{
  "code": 200,
  "msg": "上传成功",
  "data": {
    "id": "my_model",
    "name": "My Model",
    "modelUrl": "https://shiwu.shop/model/my_model/my_model.model3.json"
  }
}
```

**后端处理步骤：**

1. 接收 zip 文件
2. 创建临时目录解压
3. **校验模型完整性**（见第 4 节）
4. 提取模型 ID（用参数 name 或从 .model3.json 文件名生成）
5. 将整个模型目录移动到 `{MODEL_STORAGE_PATH}/{modelId}/`
6. 所有文件平铺在模型目录下（去掉多余的 `runtime/` 层级）
7. 将模型元信息写入数据库
8. 返回模型信息

### 3.3 删除模型

```
DELETE /api/live2d-model/{modelId}

Response:
{
  "code": 200,
  "msg": "删除成功"
}
```

注意：系统默认模型（isDefault=true）不允许删除。

### 3.4 静态文件服务

后端需要将 `{MODEL_STORAGE_PATH}` 目录作为静态资源暴露，URL 前缀为 `/model/`。

```
GET /model/{modelId}/{filename}

示例：
  GET /model/chitose/chitose.model3.json       → 返回入口文件
  GET /model/chitose/chitose.moc3              → pixi-live2d-display 自动拉取
  GET /model/chitose/chitose.1024/texture_00.png
  GET /model/chitose/expressions/Angry.exp3.json
  GET /model/chitose/motion/chitose_idle_01.motion3.json
```

**CORS 配置：** 如果模型文件域名与前端不同，需设置：
```
Access-Control-Allow-Origin: *
```

**缓存建议：** 模型文件（.moc3, .png 纹理）是静态资源，建议设置长缓存：
```
Cache-Control: public, max-age=31536000, immutable
```

---

## 4. 模型上传校验规则

### 4.1 文件结构要求

zip 包解压后必须满足以下条件，否则拒绝上传：

**必需文件（缺一不可）：**

- 存在至少一个 `*.model3.json` 文件（入口文件）
- `FileReferences.Moc` 引用的 `.moc3` 文件存在
- `FileReferences.Textures` 数组中引用的所有纹理文件存在

**可选文件：**

- `.physics3.json`（物理模拟）
- `.cdi3.json`（显示信息）
- `expressions/*.exp3.json`（表情定义）
- `motion/*.motion3.json`（动作定义）
- `.pose3.json`（姿势）

### 4.2 校验伪代码（Java/Go 参考）

```
function validateModel(dirPath):
    // 1. 找到 .model3.json 入口文件
    modelFiles = glob(dirPath, "*.model3.json")
    if modelFiles is empty → 拒绝："未找到 .model3.json 入口文件"

    entryFile = modelFiles[0]
    modelJson = parseJSON(readFile(entryFile))

    // 2. 校验 Moc 文件
    mocFile = modelJson.FileReferences.Moc
    if mocFile is empty → 拒绝："缺少 Moc 引用"
    if not exists(join(dirname(entryFile), mocFile)) → 拒绝："Moc 文件不存在: {mocFile}"

    // 3. 校验纹理文件
    textures = modelJson.FileReferences.Textures  // string[]
    if textures is empty → 拒绝："缺少纹理引用"
    for each tex in textures:
        if not exists(join(dirname(entryFile), tex)) → 拒绝："纹理文件不存在: {tex}"

    // 4. 安全检查：拒绝非模型文件
    for each file in walk(dirPath):
        ext = getExt(file)
        allowed = [".json", ".moc3", ".png", ".jpg", ".jpeg", ".webp"]
        if ext not in allowed → 拒绝："不允许的文件类型: {file}"

    return SUCCESS
```

### 4.3 .model3.json 结构参考

```json
{
  "Version": 3,
  "FileReferences": {
    "Moc": "模型名.moc3",
    "Textures": ["texture_00.png", "texture_01.png"],
    "Physics": "模型名.physics3.json",
    "DisplayInfo": "模型名.cdi3.json",
    "Expressions": [
      { "Name": "Angry.exp3.json", "File": "expressions/Angry.exp3.json" }
    ],
    "Motions": {
      "Idle": [{ "File": "motion/idle_01.motion3.json" }],
      "Tap": [{ "File": "motion/tap_01.motion3.json" }]
    }
  },
  "Groups": [...],
  "HitAreas": []
}
```

所有 `FileReferences` 中的路径都是**相对于 `.model3.json` 所在目录**的路径。`pixi-live2d-display` 会自动基于入口文件的 URL 解析这些相对路径。

---

## 5. 前端改造清单

### 5.1 新增文件

| 文件 | 用途 |
|------|------|
| `src/services/live2dModelService.ts` | 模型列表 API / 上传 / 删除 |
| `src/components/Live2DModelManager.vue` | 模型管理 UI（列表 + 上传 + 删除） |

### 5.2 修改文件

| 文件 | 改动内容 |
|------|----------|
| `src/App.vue` | `discoveredModels` 改为从 API 获取；加入模型管理入口 |
| `src/config/auto-models.ts` | 保留作为**默认模型兜底**（API 不可用时），不再从构建时扫描生成 |

### 5.3 live2dModelService.ts 接口定义

```typescript
interface Live2DModelInfo {
  id: string
  name: string
  modelUrl: string          // .model3.json 完整 URL
  previewImage?: string     // 预览图 URL
  isDefault: boolean        // 是否系统默认模型
  createdAt: string
}

class Live2DModelService {
  // GET /api/live2d-model/list
  async list(): Promise<Live2DModelInfo[]>

  // POST /api/live2d-model/upload (multipart: file + name)
  async upload(zipFile: File, name?: string): Promise<Live2DModelInfo>

  // DELETE /api/live2d-model/{id}
  async remove(modelId: string): Promise<void>
}
```

### 5.4 App.vue 关键改动

**改动前（当前）：**
```typescript
import { autoModelConfig, getValidAutoModelIds } from './config/auto-models'

const discoveredModels = computed(() => {
  const validModelIds = getValidAutoModelIds()
  return validModelIds.map(id => {
    const config = autoModelConfig[id]
    return {
      id,
      name: id.replace(/_/g, ' ')...,
      path: config?.path ?? '',
      isValid: config?.exists ?? false
    }
  })
})
```

**改动后：**
```typescript
import { live2dModelService, type Live2DModelInfo } from './services/live2dModelService'
import { autoModelConfig, getValidAutoModelIds } from './config/auto-models'

const remoteModels = ref<Live2DModelInfo[]>([])

// 模型列表：远程 API 优先，失败时降级到本地 auto-models.ts
const discoveredModels = computed(() => {
  if (remoteModels.value.length > 0) {
    return remoteModels.value.map(m => ({
      id: m.id,
      name: m.name,
      path: m.modelUrl,         // ← 直接用后端 URL
      isValid: true
    }))
  }
  // 降级到本地模型
  const validIds = getValidAutoModelIds()
  return validIds.map(id => ({
    id,
    name: ...,
    path: autoModelConfig[id].path,
    isValid: autoModelConfig[id].exists
  }))
})

onMounted(async () => {
  try {
    remoteModels.value = await live2dModelService.list()
  } catch {
    console.warn('远程模型列表获取失败，使用本地模型')
  }
})
```

### 5.5 Pixi 加载兼容性

`pixi-live2d-display` 的 `Live2DModel.from(url)` 接受 HTTP URL，会自动以该 URL 为基准解析 `.model3.json` 内所有相对路径。**无需任何额外改动。**

唯一要注意的是跨域：后端需配置 CORS 或前端部署在同域下。

---

## 6. 生产环境 Nginx 配置参考

```nginx
# API 代理
location /api/ {
    proxy_pass http://backend:8080;
}

# 模型静态文件
location /model/ {
    alias /data/live2d-models/;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=31536000, immutable";
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
    id          VARCHAR(64)  PRIMARY KEY,       -- 模型目录名，如 'chitose'
    name        VARCHAR(128) NOT NULL,           -- 显示名称
    model_url   VARCHAR(512) NOT NULL,           -- .model3.json 完整 URL
    preview_url VARCHAR(512),                    -- 预览图 URL
    owner_id    VARCHAR(64),                     -- 上传用户 ID（NULL=系统默认）
    is_default  BOOLEAN DEFAULT FALSE,           -- 是否系统默认模型
    file_size   BIGINT DEFAULT 0,                -- 模型文件总大小（字节）
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. 关键注意事项

1. **路径平铺**：用户上传的 zip 可能有嵌套目录（如 `xxx/runtime/xxx.model3.json`），后端解压后应将所有文件平铺到 `{modelId}/` 下，保证 `.model3.json` 就在模型目录根层级。

2. **同名处理**：如果上传的模型 ID 与已有模型重复，可以覆盖（用户自己更新）或拒绝并提示改名。

3. **文件大小限制**：单个 Live2D 模型通常在 10-50MB，建议上传限制设为 100MB。

4. **安全性**：
   - 只允许 `.json`, `.moc3`, `.png`, `.jpg`, `.jpeg`, `.webp` 文件类型
   - 拒绝可执行文件、脚本文件
   - 校验 `.model3.json` 是合法 JSON
   - zip 炸弹防护（解压前检查压缩包总大小）

5. **前端上传方式**：浏览器无法直接选择文件夹，两种方案：
   - 方案 A（简单）：让用户手动打包为 zip 后上传，`<input accept=".zip">`
   - 方案 B（体验好）：`<input webkitdirectory>` + 前端用 JSZip 打包后上传

---

## 9. 技术可行性评估

### 9.1 核心结论：完全可行

Live2D 模型的渲染 **100% 在浏览器本地完成**，后端只负责提供静态文件下载服务。`pixi-live2d-display` 的 `Live2DModel.from(url)` 原生支持 HTTP URL 加载，无需任何 hack。

模型加载到浏览器 WebGL 内存后，所有动画、表情、物理模拟、眨眼、鼠标跟踪都是本地渲染，不需要与后端持续交互。

### 9.2 加载与渲染生命周期

```
阶段一：模型初始化（需要网络请求）
  Live2DModel.from("https://后端/model/chitose/chitose.model3.json")
    ├─ [网络] fetch .model3.json        ← 入口文件
    ├─ [网络] fetch .moc3               ← 骨架网格数据
    ├─ [网络] fetch 所有纹理 .png        ← 贴图
    ├─ [网络] fetch .physics3.json       ← 物理参数
    ├─ [网络] fetch .pose3.json          ← 姿势参数
    └─ [网络] 预加载 Idle 组 .motion3.json ← 待机动作

  ⚡ 此阶段完成后，模型已在浏览器 WebGL 内存中
  ⚡ .moc3 骨架 + 纹理 + 物理参数 = 完整的可渲染模型

阶段二：运行动画（绝大部分在本地渲染）

  已缓存的动作/表情：
    model.motion('Tap', 0)     → 直接从内存读取，0ms 延迟
    model.expression('Smile')  → 直接从内存读取，0ms 延迟
    🟢 完全本地 WebGL 渲染，不需要任何网络请求

  首次播放未缓存的动作/表情：
    model.motion('Tap', 2)
      → [网络] fetch Tap_02.motion3.json  ← 仅首次！
      → 缓存到内存
      → 本地 WebGL 渲染播放
    🟡 仅首次需要网络请求，后续完全本地

  动画帧渲染循环（每帧 60fps）：
    眨眼 → 本地参数计算
    呼吸 → 本地参数计算
    物理模拟 → 本地计算
    鼠标跟踪 → 本地计算
    🟢 100% 本地渲染，0 网络请求
```

### 9.3 动作/表情的懒加载机制

`pixi-live2d-display` 对动作和表情文件采用**按需加载 + 内存缓存**策略：

| 资源类型 | 预加载策略 | 首次播放 | 后续播放 |
|---------|-----------|---------|---------|
| `.moc3` / 纹理 / 物理 | 初始化时全部加载 | 网络请求 | 内存缓存 |
| Idle 组动作 | 默认预加载 | 可能已缓存 | 内存缓存 |
| 其他组动作 | 不预加载 | **网络请求** | 内存缓存 |
| 表情文件 | 不预加载 | **网络请求** | 内存缓存 |

**关键：不需要每次更改动作都访问后端。** 动作/表情文件只在首次使用时下载一次，之后从内存缓存读取。

---

## 10. 补充建议

### 10.1 前端：启用动作全量预加载

当前代码使用默认的 `motionPreload` 策略（仅预加载 Idle 组），模型后端化后首次播放非 Idle 动作会有网络延迟。建议改为全量预加载：

```typescript
// 当前代码
model = await Live2DModel.from(props.modelPath, { autoInteract: false })

// 建议改为
model = await Live2DModel.from(props.modelPath, {
  autoInteract: false,
  motionPreload: "ALL"  // 预加载所有动作，避免首次播放延迟
})
```

`motionPreload` 支持三个值：
- `"IDLE"`（默认）：只预加载 Idle 组
- `"ALL"`：预加载所有组的动作
- `"NONE"`：不预加载任何动作

### 10.2 前端：添加模型加载进度指示

模型后端化后，首次加载时间会变长（10-50MB 文件通过网络下载）。建议添加加载进度 UI：

```typescript
// 监听加载进度事件
model.on('load', () => {
  // 模型核心文件加载完成
})

model.on('textureLoaded', () => {
  // 纹理加载完成
})

// 也可以通过 Live2DLoader 自定义加载行为
import { Live2DLoader } from 'pixi-live2d-display'

// 全局拦截加载请求，统计进度
const originalLoad = Live2DLoader.load
let loadedCount = 0
let totalCount = 0

Live2DLoader.load = function(url, ...args) {
  totalCount++
  return originalLoad.call(this, url, ...args).then(result => {
    loadedCount++
    const progress = Math.round((loadedCount / totalCount) * 100)
    // 更新进度 UI：progress %
    return result
  })
}
```

### 10.3 路径平铺策略修正

原方案第 8.1 节要求"将所有文件平铺到 `{modelId}/` 下，保证 `.model3.json` 就在模型目录根层级"。**建议改为保持原始目录结构**，原因：

`pixi-live2d-display` 基于 `.model3.json` 的 URL 解析所有相对路径。只要目录结构完整，路径自然正确。强制平铺反而容易破坏 `.model3.json` 中 `FileReferences` 的相对路径引用。

**推荐策略：**

1. 解压 zip 后，找到 `.model3.json` 文件所在的目录
2. 将该目录（含完整子目录结构）作为模型目录复制到 `{MODEL_STORAGE_PATH}/{modelId}/`
3. 确保 `.model3.json` 的 URL 能正确访问到所有引用文件

```
示例：用户上传 zip 解压后结构为
  my_model/runtime/my_model.model3.json
  my_model/runtime/my_model.moc3
  my_model/runtime/my_model.1024/texture_00.png
  my_model/runtime/expressions/Smile.exp3.json
  my_model/runtime/motion/idle_01.motion3.json

后端存储为：
  {MODEL_STORAGE_PATH}/my_model/my_model.model3.json
  {MODEL_STORAGE_PATH}/my_model/my_model.moc3
  {MODEL_STORAGE_PATH}/my_model/my_model.1024/texture_00.png
  {MODEL_STORAGE_PATH}/my_model/expressions/Smile.exp3.json
  {MODEL_STORAGE_PATH}/my_model/motion/idle_01.motion3.json

即：以 .model3.json 所在目录为根，去掉外层包裹目录
```

**后端处理伪代码更新：**

```
function processModelZip(zipPath, modelId):
    tempDir = unzip(zipPath)

    // 1. 找到 .model3.json 文件
    modelFiles = glob(tempDir, "**/*.model3.json")
    if modelFiles is empty → 拒绝："未找到 .model3.json 入口文件"

    entryFile = modelFiles[0]
    modelDir = dirname(entryFile)  // .model3.json 所在目录

    // 2. 校验模型完整性（同第 4 节）
    validateModel(modelDir)

    // 3. 将 modelDir 整个目录（保持结构）复制到目标位置
    targetDir = join(MODEL_STORAGE_PATH, modelId)
    if exists(targetDir) → 删除旧目录
    copyDirectory(modelDir, targetDir)

    // 4. 生成 modelUrl
    // model3.json 现在直接在 modelId/ 根下
    modelUrl = BASE_URL + "/model/" + modelId + "/" + basename(entryFile)

    // 5. 写入数据库
    saveToDatabase(modelId, name, modelUrl)

    return { id: modelId, modelUrl: modelUrl }
```

### 10.4 后端：模型文件缓存策略

模型文件是静态资源，应设置长缓存以减少重复下载：

```nginx
# .moc3 和纹理文件：长缓存（内容不变）
location ~* /model/.*\.(moc3|png|jpg|jpeg|webp)$ {
    alias /data/live2d-models/;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# .json 文件：中等缓存（可能更新）
location ~* /model/.*\.json$ {
    alias /data/live2d-models/;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
}
```

### 10.5 后端：模型上传增加预览图提取

在模型上传 API 的后端处理中，自动提取第一张纹理作为预览图，避免前端额外请求：

```
// 在 processModelZip 中增加：
modelJson = parseJSON(readFile(entryFile))
firstTexture = modelJson.FileReferences.Textures[0]
previewUrl = BASE_URL + "/model/" + modelId + "/" + firstTexture

// 写入数据库时包含 previewUrl
saveToDatabase(modelId, name, modelUrl, previewUrl)
```

### 10.6 前端：降级策略细化

当后端 API 不可用时，应平滑降级到本地模型，不影响基本使用：

```typescript
const discoveredModels = computed(() => {
  if (remoteModels.value.length > 0) {
    return remoteModels.value.map(m => ({
      id: m.id,
      name: m.name,
      path: m.modelUrl,
      isValid: true
    }))
  }
  // 降级到本地模型
  const validIds = getValidAutoModelIds()
  return validIds.map(id => ({
    id,
    name: autoModelConfig[id]?.name || id,
    path: autoModelConfig[id]?.path || '',
    isValid: autoModelConfig[id]?.exists || false
  }))
})
```

建议同时增加 API 健康检查，避免每次打开都等待超时：

```typescript
// 缓存 API 可用状态，5 分钟内不重试
let apiAvailable: boolean | null = null
let lastCheckTime = 0
const CHECK_INTERVAL = 5 * 60 * 1000

async function fetchRemoteModels(): Promise<Live2DModelInfo[]> {
  const now = Date.now()
  if (apiAvailable === false && now - lastCheckTime < CHECK_INTERVAL) {
    return []
  }
  try {
    const models = await live2dModelService.list()
    apiAvailable = true
    return models
  } catch {
    apiAvailable = false
    lastCheckTime = now
    console.warn('远程模型列表获取失败，使用本地模型')
    return []
  }
}
```

### 10.7 前端：模型切换时的资源释放

从后端加载模型后，切换模型时需要释放旧模型的 WebGL 资源，避免内存泄漏：

```typescript
// 切换模型前，销毁旧模型
if (model) {
  model.destroy({
    children: true,
    texture: true,    // 释放 WebGL 纹理
    baseTexture: true // 释放基础纹理
  })
  model = null
}
```

当前代码中 `loadModel()` 已有 `model?.destroy()` 调用，但建议确认 `destroy` 参数包含 `texture: true` 以确保 GPU 资源释放。

### 10.8 模型上传 API 补充字段

建议在模型上传响应中增加文件大小和文件数量信息，方便前端展示：

```json
{
  "code": 200,
  "msg": "上传成功",
  "data": {
    "id": "my_model",
    "name": "My Model",
    "modelUrl": "https://shiwu.shop/model/my_model/my_model.model3.json",
    "previewImage": "https://shiwu.shop/model/my_model/my_model.1024/texture_00.png",
    "fileSize": 15728640,
    "fileCount": 12
  }
}
```

---

## 11. 改造优先级建议

| 优先级 | 改造项 | 原因 |
|-------|--------|------|
| P0 | 后端：模型列表 API + 静态文件服务 | 核心功能，前端才能切换到后端加载 |
| P0 | 前端：`discoveredModels` 改为从 API 获取 | 对接后端模型列表 |
| P0 | 前端：`motionPreload: "ALL"` | 避免后端化后首次动作播放延迟 |
| P1 | 后端：模型上传 API | 支持运行时添加模型 |
| P1 | 前端：加载进度指示 | 后端化后加载变慢，需要进度反馈 |
| P1 | 前端：降级策略 | API 不可用时仍能使用本地模型 |
| P2 | 后端：模型删除 API | 完整的模型管理闭环 |
| P2 | 前端：模型管理 UI | 用户自助上传/删除模型 |
| P2 | 前端：模型切换资源释放 | 防止内存泄漏 |
| P3 | 后端：预览图自动提取 | 优化模型列表展示体验 |
| P3 | Nginx 缓存策略优化 | 减少重复下载 |
