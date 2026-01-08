/**
 * Live2D 模型配置文件
 * 
 * 添加新模型的步骤：
 * 1. 将模型文件夹放入 public/model/ 目录
 * 2. 在下面的 modelConfig 对象中添加新的配置项
 * 3. key 为模型的唯一标识（建议使用文件夹名）
 * 4. name 为显示名称
 * 5. path 为模型的 .model3.json 文件路径（相对于 public 目录）
 */

export interface ModelConfig {
  name: string      // 显示名称
  path: string      // 模型文件路径
  description?: string  // 模型描述（可选）
}

export const modelConfig: Record<string, ModelConfig> = {
  // 战舰少女模型
  biaoqiang_3: {
    name: '标枪',
    path: '/model/biaoqiang_3/biaoqiang_3.model3.json',
    description: '战舰少女 - 标枪'
  },
  banerwei_3: {
    name: '班纳维',
    path: '/model/banerwei_3/banerwei_3.model3.json',
    description: '战舰少女 - 班纳维'
  },

  // Live2D 官方示例模型
  chitose: {
    name: '千岁',
    path: '/model/chitose/runtime/chitose.model3.json',
    description: 'Live2D 官方示例 - 千岁'
  },
  epsilon: {
    name: 'Epsilon',
    path: '/model/Epsilon/runtime/Epsilon.model3.json',
    description: 'Live2D 官方示例 - Epsilon'
  },
  gantzert: {
    name: 'Gantzert Felixander',
    path: '/model/Gantzert_Felixander/runtime/Gantzert_Felixander.model3.json',
    description: 'Live2D 官方示例 - Gantzert Felixander'
  },
  haru: {
    name: 'Haru',
    path: '/model/haru/runtime/haru.model3.json',
    description: 'Live2D 官方示例 - Haru'
  },
  haru_greeter: {
    name: 'Haru Greeter',
    path: '/model/haru_greeter_pro_jp/runtime/haru_greeter_t03.model3.json',
    description: 'Live2D 官方示例 - Haru Greeter'
  },
  hiyori: {
    name: 'Hiyori',
    path: '/model/hiyori_pro_zh/runtime/hiyori_pro_t10.model3.json',
    description: 'Live2D 官方示例 - Hiyori'
  },
  miku: {
    name: '初音未来',
    path: '/model/miku_pro_jp/runtime/miku_sample_t04.model3.json',
    description: 'Live2D 官方示例 - 初音未来'
  },
  natori: {
    name: 'Natori',
    path: '/model/natori_pro_jp/runtime/natori_pro_t04.model3.json',
    description: 'Live2D 官方示例 - Natori'
  },

  // 在这里继续添加更多模型...
  // 格式示例：
  // model_id: {
  //   name: '显示名称',
  //   path: '/model/文件夹名/模型文件.model3.json',
  //   description: '模型描述'
  // },
}

/**
 * 获取所有模型的 ID 列表
 */
export const getModelIds = (): string[] => {
  return Object.keys(modelConfig)
}

/**
 * 获取所有模型配置
 */
export const getAllModels = (): Record<string, ModelConfig> => {
  return modelConfig
}

/**
 * 根据 ID 获取模型配置
 */
export const getModelById = (id: string): ModelConfig | undefined => {
  return modelConfig[id]
}

/**
 * 检查模型 ID 是否存在
 */
export const hasModel = (id: string): boolean => {
  return id in modelConfig
}
