# Live2D 模型管理指南

本指南说明如何在项目中添加和管理 Live2D 模型。

## 📋 目录结构

```
public/model/
├── biaoqiang_3/          # 模型文件夹
│   ├── biaoqiang_3.model3.json  # 模型配置文件（必需）
│   ├── biaoqiang_3.moc3         # 模型数据文件
│   ├── textures/                # 纹理文件夹
│   └── motions/                 # 动作文件夹
├── banerwei_3/
└── ...其他模型
```

## ✨ 添加新模型（手动方式）

### 步骤 1: 准备模型文件

1. 将模型文件夹放入 `public/model/` 目录
2. 确保模型文件夹包含 `.model3.json` 文件（这是主配置文件）

### 步骤 2: 在配置文件中注册模型

打开 `src/config/models.ts`，在 `modelConfig` 对象中添加新的模型配置：

```typescript
export const modelConfig: Record<string, ModelConfig> = {
  // 现有模型...
  
  // 添加你的新模型
  your_model_id: {
    name: '模型显示名称',
    path: '/model/模型文件夹名/模型文件.model3.json',
    description: '模型描述（可选）'
  },
}
```

#### 配置说明

- **key (模型ID)**: 模型的唯一标识符
  - 建议使用模型文件夹名
  - 只能包含字母、数字、下划线
  - 示例: `biaoqiang_3`, `chitose`, `miku`

- **name**: 在界面中显示的模型名称
  - 可以使用中文
  - 示例: `'标枪'`, `'初音未来'`

- **path**: 模型文件的路径
  - 必须以 `/model/` 开头
  - 路径相对于 `public` 目录
  - 必须指向 `.model3.json` 文件
  - 示例: `'/model/biaoqiang_3/biaoqiang_3.model3.json'`

- **description**: 模型的描述（可选）
  - 用于提供额外信息
  - 示例: `'战舰少女 - 标枪'`

### 步骤 3: 测试模型

1. 保存配置文件
2. 启动开发服务器（如果已启动会自动刷新）
3. 在右下角的模型选择器中查看新模型
4. 切换到新模型进行测试

## 📝 完整示例

假设你有一个新模型 `azurlane_javelin`，文件结构如下：

```
public/model/azurlane_javelin/
├── javelin.model3.json
├── javelin.moc3
├── textures/
│   └── texture_00.png
└── motions/
    ├── idle.motion3.json
    └── tap_body.motion3.json
```

在 `src/config/models.ts` 中添加：

```typescript
export const modelConfig: Record<string, ModelConfig> = {
  // ... 其他模型

  azurlane_javelin: {
    name: '碧蓝航线 - 标枪',
    path: '/model/azurlane_javelin/javelin.model3.json',
    description: '碧蓝航线游戏角色 - 标枪'
  },
}
```

## 🔍 查找模型配置文件

不同的模型可能有不同的目录结构：

### 标准结构
```
模型文件夹/
└── 模型名.model3.json  ← 直接在根目录
```

### Runtime 结构（常见于官方示例）
```
模型文件夹/
└── runtime/
    └── 模型名.model3.json  ← 在 runtime 子目录
```

**重要**: 路径必须指向实际的 `.model3.json` 文件位置！

## 🚀 方法二：自动扫描模型（推荐）

✅ **项目已实现完整的自动化扫描功能**

如果你有大量模型需要批量添加，或希望每次添加新模型后自动更新配置，可以使用自动扫描脚本。

### 1. 运行自动扫描

```bash
npm run scan-models
```

脚本会自动：
- 🔍 递归扫描 `public/model/` 目录
- 📝 查找所有 `.model3.json` 文件
- ✨ 智能处理 `runtime` 子目录结构
- 📄 生成 `src/config/auto-models.ts` 配置文件
- 📊 输出扫描结果和统计信息

### 2. 扫描输出示例

```
🔍 开始扫描 Live2D 模型...

📁 扫描目录: D:\vue\live2d\public\model

✅ 找到 10 个模型文件:

   • biaoqiang_3
     名称: Biaoqiang 3
     路径: /model/biaoqiang_3/biaoqiang_3.model3.json

   • chitose
     名称: Chitose
     路径: /model/chitose/runtime/chitose.model3.json
   
   ... (更多模型)

✅ 配置文件已生成: src\config\auto-models.ts
📊 总计: 10 个模型
```

### 3. 使用自动生成的配置

自动生成的 `src/config/auto-models.ts` 文件包含：

```typescript
export const autoModelConfig: Record<string, ModelConfig> = {
  biaoqiang_3: {
    name: 'Biaoqiang 3',
    path: '/model/biaoqiang_3/biaoqiang_3.model3.json',
    description: '自动检测的模型'
  },
  chitose: {
    name: 'Chitose',
    path: '/model/chitose/runtime/chitose.model3.json',
    description: '自动检测的模型'
  },
  // ... 其他模型
}
```

**方式一：直接使用自动配置**

在 `src/App.vue` 中：

```typescript
// 替换导入
import { autoModelConfig, getAutoModelIds } from './config/auto-models'

// 使用自动配置
const availableModels = getAutoModelIds()
const modelPath = computed(() => autoModelConfig[currentModel.value]?.path || '')
```

**方式二：合并手动和自动配置**

在 `src/config/models.ts` 中：

```typescript
import { autoModelConfig } from './auto-models'

export const modelConfig: Record<string, ModelConfig> = {
  // 手动配置的模型（可覆盖自动检测的配置，添加自定义名称和描述）
  biaoqiang_3: {
    name: '标枪',
    path: '/model/biaoqiang_3/biaoqiang_3.model3.json',
    description: '战舰少女 - 标枪'
  },
  
  // 合并自动检测的其他模型
  ...autoModelConfig,
}
```

### 4. 添加新模型的自动化流程

1. **放置模型文件**
   ```bash
   # 将新模型放入 public/model/ 目录
   public/model/new_model/
   └── new_model.model3.json
   ```

2. **运行扫描脚本**
   ```bash
   npm run scan-models
   ```

3. **完成！** 
   - 新模型会自动添加到配置文件
   - 刷新浏览器即可看到新模型

### 5. 脚本特性

✨ **智能 ID 生成**
- 使用模型文件夹名作为 ID
- 自动处理 `runtime` 子目录（使用父目录名）
- 清理特殊字符，确保 ID 有效

✨ **友好的名称生成**
- 自动美化模型名称
- 将下划线转换为空格
- 首字母大写

✨ **辅助函数**
```typescript
// 获取所有模型 ID
getAutoModelIds(): string[]

// 获取模型数量
getAutoModelCount(): number

// 检查模型是否存在
hasAutoModel(id: string): boolean
```

## ⚠️ 常见问题

### 模型不显示
1. 检查路径是否正确（注意大小写）
2. 确认 `.model3.json` 文件存在
3. 打开浏览器控制台查看错误信息
4. 检查模型文件是否完整（纹理、动作文件等）

### 模型显示异常
1. 确认模型文件格式正确（应为 Cubism 4.x 格式）
2. 检查纹理文件路径是否正确
3. 查看浏览器控制台的警告信息

### 模型列表中找不到新模型
1. 确认配置文件已保存
2. 刷新浏览器页面
3. 检查配置语法是否正确

## 📚 模型文件说明

- `.model3.json`: 模型主配置文件，包含模型的所有设置和文件引用
- `.moc3`: 模型数据文件，包含模型的网格和绘制数据
- `.physics3.json`: 物理配置文件，定义模型的物理效果（如头发、衣服晃动）
- `.pose3.json`: 姿势配置文件，定义模型部件之间的关联
- `.motion3.json`: 动作文件，定义模型的动画
- `textures/`: 纹理文件夹，包含模型的贴图
- `expressions/`: 表情文件夹，包含模型的表情配置

## 🎯 最佳实践

1. **统一命名**: 使用清晰、一致的命名规范
2. **添加描述**: 为每个模型添加有意义的描述
3. **测试模型**: 添加新模型后立即测试
4. **备份配置**: 定期备份 `models.ts` 配置文件
5. **文档更新**: 记录特殊模型的配置要求

## 🔧 维护建议

- 定期清理不使用的模型文件
- 保持配置文件的整洁和有序
- 为模型分组（如按游戏、角色类型等）
- 记录模型的来源和版权信息

## 📖 相关资源

- [Live2D Cubism SDK](https://www.live2d.com/download/cubism-sdk/)
- [pixi-live2d-display 文档](https://github.com/guansss/pixi-live2d-display)
- [Live2D 官方文档](https://docs.live2d.com/)
