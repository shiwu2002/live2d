# Live2D 桌面端应用

这是一个基于 Vue 3 + Vite + pixi-live2d-display 实现的 Live2D 桌面端展示应用。

## 功能特性

✨ **核心功能**
- ✅ Live2D Cubism 4.x 模型加载与渲染
- ✅ 自动眨眼动画
- ✅ 鼠标视线跟随
- ✅ 模型位置和缩放实时调整
- ✅ 高分辨率渲染支持
- ✅ 流畅的动画播放

🎮 **交互功能**
- 鼠标移动：模型视线会跟随鼠标位置
- 控制面板：可实时调整模型的缩放和位置

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 新一代前端构建工具
- **Pixi.js 6.x** - 2D WebGL 渲染引擎
- **pixi-live2d-display** - Live2D 模型渲染库
- **Live2D Cubism Core** - Live2D 核心运行时库

## 项目结构

```
live2d/
├── public/
│   └── model/
│       └── biaoqiang_3/          # Live2D 模型文件
│           ├── biaoqiang_3.model3.json
│           ├── biaoqiang_3.moc3
│           ├── biaoqiang_3.physics3.json
│           ├── textures/
│           └── motions/
├── src/
│   ├── components/
│   │   └── Live2DModel.vue      # Live2D 核心组件
│   ├── App.vue                  # 主应用组件
│   ├── main.ts                  # 应用入口
│   └── style.css                # 全局样式
├── LIVE2D_IMPLEMENTATION_GUIDE.md  # 实现指南
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173/` 启动。

### 3. 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/` 目录。

### 4. 预览生产版本

```bash
npm run preview
```

## 使用说明

### 基本交互

1. **鼠标跟随**：移动鼠标，Live2D 模型的眼睛会跟随鼠标位置转动
2. **自动眨眼**：模型会自动执行眨眼动画（3-8秒随机间隔）
3. **控制面板**：使用右上角的控制面板可以调整：
   - 模型缩放（0.1 - 1.0）
   - 模型 X 轴位置
   - 模型 Y 轴位置

### 更换模型

如需更换其他 Live2D 模型，请：

1. 将模型文件放入 `public/model/` 目录
2. 修改 `src/App.vue` 中的 `modelPath` 变量：

```typescript
const modelPath = '/model/your-model/your-model.model3.json'
```

## 核心实现

### Live2D 模型组件 (Live2DModel.vue)

组件实现了以下核心功能：

1. **Pixi 应用初始化**
   - 使用高分辨率渲染（2倍分辨率）
   - 透明背景支持
   - 保留绘图缓冲区

2. **模型加载**
   - 支持 .model3.json 格式
   - 支持 .zip 压缩包格式
   - 自动锚点居中

3. **动画系统**
   - 自定义眨眼逻辑
   - 平滑的缓动函数
   - 可配置的动画参数

4. **交互系统**
   - 鼠标视线跟随
   - 实时参数更新
   - 响应式位置调整

## 技术细节

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

### 渲染优化

- 高分辨率渲染：`width/height * 2`
- CSS 缩放：`stage.scale.set(2)`
- 防抖处理：窗口 resize 时使用防抖
- 错误保护：渲染循环包含错误处理

### 参数控制

模型支持以下参数控制：

- `ParamAngleX/Y/Z` - 头部旋转
- `ParamEyeLOpen/ROpen` - 左右眼睁开度
- `ParamEyeBallX/Y` - 眼球位置
- `ParamMouthOpenY` - 嘴巴张开度
- `ParamBodyAngleX/Y/Z` - 身体旋转

## 常见问题

### Q: 模型加载失败？

**A:** 请检查：
- 模型文件路径是否正确
- `.model3.json` 文件和相关资源是否在同一目录
- 浏览器控制台是否有 CORS 错误

### Q: 模型显示异常？

**A:** 请检查：
- 模型缩放参数是否为有效值（不为 0 或 NaN）
- 分辨率设置是否正确
- 浏览器是否支持 WebGL

### Q: 如何添加更多动画？

**A:** 在 `Live2DModel.vue` 中添加：

```typescript
// 播放指定动画
await model.motion('动画组名', 动画索引)

// 例如播放 idle 动画
await model.motion('idle', 0)
```

## 扩展功能

可以基于当前实现添加以下功能：

- [ ] TTS 口型同步
- [ ] 情绪表情系统
- [ ] 节拍同步（Beat Sync）
- [ ] 模型阴影效果
- [ ] 点击交互动画
- [ ] 多模型切换
- [ ] Electron 桌面应用封装

## 参考资源

- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- [Pixi.js 官方文档](https://pixijs.com/)
- [Live2D Cubism SDK](https://www.live2d.com/en/sdk/)

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
