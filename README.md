# Live2D 智能交互应用

这是一个基于 Vue 3 + Vite + pixi-live2d-display 实现的 Live2D 智能交互桌面应用，集成了实时聊天、语音交互、WebSocket 通信等功能。

## ✨ 功能特性

### 🎭 Live2D 展示

- ✅ Live2D Cubism 4.x 模型加载与渲染
- ✅ 自动眨眼动画
- ✅ 鼠标视线跟随
- ✅ 模型位置和缩放实时调整
- ✅ 高分辨率渲染支持
- ✅ 流畅的动画播放
- ✅ 多模型支持与自动扫描

### 💬 智能聊天

- ✅ 实时文本消息收发
- ✅ 图片消息展示与预览
- ✅ 音频消息录制与播放
- ✅ 控制消息提示
- ✅ 消息时间戳显示
- ✅ 消息类型过滤与展示

### 🔊 语音交互

- ✅ 实时语音录制
- ✅ 音频文件播放
- ✅ 通话时长统计
- ✅ 音频时长格式化
- ✅ 音频波形显示

### 🌐 通信能力

- ✅ WebSocket 实时通信
- ✅ 自动重连机制
- ✅ 消息队列管理
- ✅ 连接状态监控

## 🛠 技术栈

### 前端框架

- **Vue 3** - 渐进式 JavaScript 框架（Composition API）
- TypeScript - 类型安全的 JavaScript 超集
- **Vite** - 新一代前端构建工具

### 渲染引擎

- **Pixi.js 6.x** - 2D WebGL 渲染引擎
- **pixi-live2d-display** - Live2D 模型渲染库
- **Live2D Cubism Core** - Live2D 核心运行时库

### 通信与音频

- **WebSocket** - 实时双向通信
- **MediaRecorder API** - 音频录制
- **HTMLAudioElement** - 音频播放

## 📁 项目结构

```
live2d/
├── public/
│   ├── model/                    # Live2D 模型资源目录
│   │   ├── chitose/              # 千岁模型
│   │   ├── Epsilon/              # Epsilon 模型
│   │   ├── haru/                 # Haru 模型
│   │   ├── miku_pro_jp/          # 初音未来模型
│   │   └── ...                   # 更多模型
│   └── vite.svg
├── src/
│   ├── components/               # 组件目录
│   │   ├── Live2DModel.vue       # Live2D 核心组件
│   │   ├── ChatWindow.vue        # 聊天窗口组件
│   │   └── HelloWorld.vue        # 示例组件
│   ├── services/                 # 服务层
│   │   ├── websocket.ts          # WebSocket 服务
│   │   └── audio.ts              # 音频处理服务
│   ├── utils/                    # 工具函数
│   │   ├── message.ts            # 消息处理工具
│   │   └── time.ts               # 时间格式化工具
│   ├── types/                    # 类型定义
│   │   └── chat.ts               # 聊天相关类型
│   ├── config/                   # 配置文件
│   │   ├── models.ts             # 模型配置
│   │   ├── auto-models.ts        # 自动扫描模型配置
│   │   └── chat.ts               # 聊天配置
│   ├── assets/                   # 静态资源
│   ├── App.vue                   # 主应用组件
│   ├── main.ts                   # 应用入口
│   └── style.css                 # 全局样式
├── scripts/
│   └── scan-models.js            # 模型扫描脚本
├── LIVE2D_IMPLEMENTATION_GUIDE.md  # Live2D 实现指南
├── MODEL_MANAGEMENT_GUIDE.md       # 模型管理指南
└── package.json
```

## 🚀 快速开始

### 前置条件

- **Node.js** >= 18
- **npm** >= 9（或 pnpm/yarn）
- **Rust** 工具链（仅桌面端需要，[安装指南](https://tauri.app/start/prerequisites/)）
- **macOS**: Xcode Command Line Tools (`xcode-select --install`）
- **Windows**: Microsoft Visual Studio C++ Build Tools + WebView2
- **Linux**: libwebkit2gtk-4.0-dev, libgtk-3-dev, libayatana-dev

### 1、安装rust

[rustup.rs - Rust 工具链安装器](https://rustup.rs/?spm=5176.28103460.0.0.1bca2988qYpY1H)

### 2、 安装依赖

```bash
npm install
```

***

## 💻 启动方式

### Web 端（浏览器）

在浏览器中预览应用，适合开发和调试：

```bash
# 开发模式（热更新，默认端口 5173）
npm run dev

# 构建后预览生产版本
npm run build && npm run preview
```

启动后在浏览器访问 `http://localhost:5173/`

> ⚠️ Web 端不支持窗口拖拽、透明背景、置顶等桌面端特性，仅用于功能调试。

### 桌面端（Tauri 桌面宠物）

使用 Tauri 将应用打包为原生桌面窗口，支持：

- ✅ 窗口拖拽移动（顶部拖拽手柄）
- ✅ 模型背景隐藏（更多菜单 → 隐藏背景）
- ✅ 窗口始终置顶
- ✅ 无边框透明窗口
- ✅ 系统托盘集成

```bash
# 开发模式（同时启动 Vite 和 Tauri 窗口，支持热更新）
npm run tauri dev
```

首次运行会自动编译 Rust 后端，耗时约 1-3 分钟。之后修改前端代码会**即时热更新**，无需重启。

#### 桌面端操作说明

| 操作         | 方式                         |
| ---------- | -------------------------- |
| **拖动窗口**   | 按住窗口顶部的药丸形拖拽手柄拖动           |
| **切换模型**   | 点击底部工具栏 "..." → 选择模型       |
| **隐藏模型背景** | 点击底部工具栏 "..." → "🖼️ 隐藏背景" |
| **聊天**     | 点击聊天图标按钮                   |
| **语音通话**   | 点击电话图标按钮                   |
| **最小化/退出** | 通过更多菜单操作                   |

***

## 📦 打包安装包

### 构建生产版本

```bash
# 仅构建前端资源（生成 dist/ 目录）
npm run build

# 构建 Tauri 桌面端安装包（包含前端构建 + Rust 编译）
npm run tauri build
```

安装包输出位置：

```
src-tauri/target/release/bundle/
├── dmg/              # macOS: .dmg 安装镜像
├── app/              # macOS: .app 应用程序
├── msi/              # Windows: .msi 安装程序
└── deb/              # Linux: .deb 安装包
```

### 各平台打包详情

#### macOS

```bash
npm run tauri build
# 输出:
#   src-tauri/target/release/bundle/dmg/Live2D桌宠_0.1.0_aarch64.dmg
#   src-tauri/target/release/bundle/app/Live2D桌宠.app
```

> ⚠️ macOS 打包需要开启 `macos-private-api` 功能（已在 Cargo.toml 中配置），这意味着**无法上架 Mac App Store**。如需上架，请移除该 feature。

#### Windows

```bash
npm run tauri build
# 输出:
#   src-tauri/target/release/bundle/msi/Live2D桌宠_0.1.0_x64_en-US.msi
#   src-tauri/target/release/bundle/nsis/Live2D桌宠_0.1.0_x64-setup.exe  (NSIS)
```

需要提前安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)。

#### Linux (deb)

```bash
npm run tauri build
# 输出:
#   src-tauri/target/release/bundle/deb/live2d_0.1.0_amd64.deb
```

依赖：`libwebkit2gtk-4.0-37`, `libgtk-3`, `libayatana`

```bash
sudo apt install libwebkit2gtk-4.0-37 libgtk-3-0 libayatana0.1
```

### 自定义打包配置

打包选项在 `src-tauri/tauri.conf.json` 的 `bundle` 字段中配置：

```jsonc
{
  "bundle": {
    "active": true,
    "targets": "all",           // "all" | "appimage" | "deb" | "msi" | "dmg"
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",       // macOS
      "icons/icon.ico"         // Windows
    ],
    // macOS 特定
    "macos": {
      "minimumSystemVersion": "10.15",
      "entitlements": null,
      "exceptionDomain": "",
      "signingIdentity": null,   // Apple Developer ID（代码签名）
      "notarize": false,          // 是否公证（需 Apple 账号）
      "providerShortName": ""
    },
    // Windows 特定
    "windows": {
      "certificateThumbprint": null,  // 代码签名证书指纹
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

***

## 🔧 高级配置

### Tauri 窗口配置

窗口属性在 `src-tauri/tauri.conf.json` → `app.windows` 中定义：

```jsonc
{
  "label": "main",
  "title": "Live2D桌宠",
  "width": 400,
  "height": 500,
  "minWidth": 200,
  "minHeight": 300,
  "resizable": true,        // 允许调整大小
  "fullscreen": false,
  "transparent": true,       // 透明窗口（macOS 需 macos-private-api）
  "decorations": false,      // 无边框
  "alwaysOnTop": true,       // 始终置顶
  "skipTaskbar": false,       // 显示在任务栏
  "shadow": false            // 无窗口阴影
}
```

### 模型管理

#### 自动扫描模型

将 Live2D 模型放入 `public/model/你的模型名/runtime/` 目录，然后运行：

```bash
npm run scan-models
```

这会自动扫描所有 `.model3.json` 文件并更新 `src/config/auto-models.ts`。

#### 支持的模型格式

每个模型目录需包含：

```
your-model/
├── runtime/
│   ├── your-model.model3.json     # 模型定义文件（必需）
│   ├── your-model.moc3           # 模型数据（必需）
│   ├── your-model.physics3.json  # 物理配置（可选）
│   ├── your-model.cdi3.json      # 显示信息（可选）
│   └── your-model.1024/          # 纹理目录
│       ├── texture_00.png
│       ├── texture_01.png
│       └── ...
├── motions/                      # 动作目录（可选）
│   ├── idle.motion3.json
│   └── ...
└── expressions/                  # 表情目录（可选）
    ├── normal.exp3.json
    └── ...
```

### WebSocket 配置

编辑 `src/config/chat.ts` 修改服务器地址和连接参数。

## 📖 使用说明

### Live2D 模型交互

1. **鼠标跟随**：移动鼠标，Live2D 模型的眼睛会跟随鼠标位置转动
2. **自动眨眼**：模型会自动执行眨眼动画（3-8秒随机间隔）
3. **控制面板**：使用控制面板可以调整：
   - 模型缩放（0.1 - 1.0）
   - 模型 X 轴位置
   - 模型 Y 轴位置

### 聊天功能

1. **发送消息**：在输入框中输入文本并发送
2. **语音录制**：点击录音按钮开始/结束录音
3. **图片查看**：点击图片消息可查看大图
4. **消息类型**：
   - 文本消息（TEXT）
   - 图片消息（IMAGES）
   - 音频消息（AUDIO）
   - 控制消息（CONTROL）

### 模型管理

#### 自动扫描模型

运行模型扫描脚本自动发现所有可用模型：

```bash
node scripts/scan-models.js
```

脚本会扫描 `public/model/` 目录下的所有模型，并更新 `src/config/auto-models.ts`。

#### 手动添加模型

1. 将模型文件放入 `public/model/your-model/` 目录
2. 在 `src/config/models.ts` 中添加配置：

```typescript
{
  name: '你的模型名称',
  path: '/model/your-model/your-model.model3.json',
  scale: 0.15,
  x: 0,
  y: 80
}
```

详细说明请参考 [MODEL\_MANAGEMENT\_GUIDE.md](./MODEL_MANAGEMENT_GUIDE.md)。

## 🏗 核心实现

### Live2D 模型渲染 (Live2DModel.vue)

- Pixi 应用初始化（高分辨率渲染）
- 模型加载（支持 .model3.json 和 .zip 格式）
- 自定义眨眼动画系统
- 鼠标视线跟随
- 实时参数更新

### 聊天窗口 (ChatWindow\.vue)

- 消息类型过滤与展示
- 图片预览功能
- 音频播放控制
- 自动滚动到底部
- 响应式布局

### WebSocket 通信 (websocket.ts)

- 自动重连机制
- 消息队列管理
- 事件订阅系统
- 连接状态监控

### 音频处理 (audio.ts)

- 录音功能（MediaRecorder）
- 音频播放管理
- 时长格式化
- 错误处理

### 工具函数

#### 消息处理 (utils/message.ts)

```typescript
// 消息类型判断
isDisplayableMessage(msg: ChatMessage): boolean

// 内容提取
getTextContent(content: string | object): string
getImageUrls(content: string | object): string[]
getControlText(content: string | object): string

// 消息ID生成
generateMessageId(): string
```

#### 时间格式化 (utils/time.ts)

```typescript
// 时间格式化
formatTime(timestamp: number): string           // HH:MM
formatDuration(milliseconds: number): string    // 音频时长
formatCallDuration(seconds: number): string     // MM:SS
getRelativeTime(timestamp: number): string      // 相对时间
formatDate(timestamp: number): string           // YYYY-MM-DD
formatDateTime(timestamp: number): string       // 完整日期时间
```

## 🔧 技术细节

### 依赖版本

**NPM 依赖：**

```json
{
  "pixi-live2d-display": "^0.4.0",
  "@pixi/app": "6.5.10",
  "@pixi/core": "6.5.10",
  "@pixi/display": "6.5.10",
  "@pixi/sprite": "6.5.10",
  "@pixi/ticker": "6.5.10",
  "@pixi/extensions": "6.5.10",
  "jszip": "^3.10.1"
}
```

**CDN 依赖：**

- Live2D Cubism Core: `https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js`
  > ⚠️ 注意：此库已在 `index.html` 中通过 CDN 引入，是 Live2D 模型运行的核心依赖。

### 类型系统

项目使用 TypeScript 严格模式，所有核心类型定义在 `src/types/` 目录：

```typescript
// 消息类型
export type MessageType = 'TEXT' | 'IMAGES' | 'AUDIO' | 'CONTROL' | ...
export type DisplayableMessageType = 'TEXT' | 'IMAGES' | 'AUDIO'

// 消息接口
export interface ChatMessage {
  type: MessageType
  content: string | object
  timestamp: number
  // ...
}
```

### 渲染优化

- 高分辨率渲染：`width/height * 2`
- CSS 缩放：`stage.scale.set(2)`
- 防抖处理：窗口 resize 时使用防抖
- 错误保护：渲染循环包含错误处理

### 模型参数控制

模型支持以下参数控制：

- `ParamAngleX/Y/Z` - 头部旋转
- `ParamEyeLOpen/ROpen` - 左右眼睁开度
- `ParamEyeBallX/Y` - 眼球位置
- `ParamMouthOpenY` - 嘴巴张开度
- `ParamBodyAngleX/Y/Z` - 身体旋转

## 📝 最近更新

### v2.0.0 - 项目结构优化 (2026-01-09)

#### 新增工具函数模块

- **消息处理工具** (`src/utils/message.ts`)
  - 提取消息类型判断、内容解析等通用逻辑
  - 统一消息ID生成机制
  - 提供类型安全的消息过滤
- **时间格式化工具** (`src/utils/time.ts`)
  - 集中管理所有时间格式化逻辑
  - 支持多种时间显示格式
  - 提供相对时间计算

#### 类型系统优化

- 改进 `src/types/chat.ts` 类型定义
- 新增 `DisplayableMessageType` 和 `DisplayableMessage` 类型
- 优化类型推断和类型守卫

#### 组件重构

- 重构 `ChatWindow.vue`，消除代码重复
- 使用工具函数替代本地函数定义
- 提升代码可维护性和可测试性

## ❓ 常见问题

### Q: 模型加载失败？

**A:** 请检查：

- 模型文件路径是否正确
- `.model3.json` 文件和相关资源是否在同一目录
- 浏览器控制台是否有 CORS 错误
- 运行 `node scripts/scan-models.js` 更新模型配置

### Q: 模型显示异常？

**A:** 请检查：

- 模型缩放参数是否为有效值（不为 0 或 NaN）
- 分辨率设置是否正确
- 浏览器是否支持 WebGL

### Q: WebSocket 连接失败？

**A:** 请检查：

- WebSocket 服务器地址是否正确
- 服务器是否正常运行
- 网络连接是否正常
- 查看 `src/config/chat.ts` 中的配置

### Q: 如何添加更多动画？

**A:** 在 `Live2DModel.vue` 中添加：

```typescript
// 播放指定动画
await model.motion('动画组名', 动画索引)

// 例如播放 idle 动画
await model.motion('idle', 0)
```

### Q: 如何自定义消息类型？

**A:**

1. 在 `src/types/chat.ts` 中添加新的消息类型
2. 在 `src/utils/message.ts` 中添加对应的处理逻辑
3. 在 `ChatWindow.vue` 中添加渲染逻辑

## 🎯 扩展功能

可以基于当前实现添加以下功能：

### 已实现

- ✅ WebSocket 实时通信
- ✅ 音频录制与播放
- ✅ 图片消息展示
- ✅ 多模型支持
- ✅ 模块化架构

### 待开发

- [ ] TTS 口型同步
- [ ] 情绪表情系统
- [ ] 节拍同步（Beat Sync）
- [ ] 模型阴影效果
- [ ] 点击交互动画
- [ ] 历史消息记录
- [ ] 用户设置面板
- [ ] Electron 桌面应用封装
- [ ] 多语言支持

## 🔗 参考资源

- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- [Pixi.js 官方文档](https://pixijs.com/)
- [Live2D Cubism SDK](https://www.live2d.com/en/sdk/)
- [Vue 3 官方文档](https://cn.vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vite 官方文档](https://cn.vitejs.dev/)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 ESLint 进行代码检查
- 编写清晰的注释和文档
- 保持代码风格一致

## 👥 作者

- 项目维护者：\[Your Name]
- 贡献者列表：查看 [Contributors](../../graphs/contributors)

***

**⭐ 如果这个项目对你有帮助，请给个 Star！**
