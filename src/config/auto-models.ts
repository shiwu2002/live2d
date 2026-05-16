/**
 * Live2D 模型配置文件（自动生成）
 * 生成时间: 2026-05-16T03:43:53.903Z
 * 基础路径: /live2d/
 * 
 * ⚠️ 警告：此文件由 scripts/scan-models.js 自动生成
 * 如需修改配置，请编辑 src/config/models.ts 或重新运行扫描脚本
 */

export interface ModelConfig {
  name: string
  path: string
  description?: string
  exists: boolean  // 文件是否存在验证标记
}

export const autoModelConfig: Record<string, ModelConfig> = {
  chitose: {
    name: 'Chitose',
    path: '/live2d/model/chitose/runtime/chitose.model3.json',
    description: '自动检测的模型',
    exists: true
  },
  Epsilon: {
    name: 'Epsilon',
    path: '/live2d/model/Epsilon/runtime/Epsilon.model3.json',
    description: '自动检测的模型',
    exists: true
  },
  haru: {
    name: 'Haru',
    path: '/live2d/model/haru/runtime/haru.model3.json',
    description: '自动检测的模型',
    exists: true
  },
  haru_greeter_pro_jp: {
    name: 'Haru Greeter T03',
    path: '/live2d/model/haru_greeter_pro_jp/runtime/haru_greeter_t03.model3.json',
    description: '自动检测的模型',
    exists: true
  },
  hiyori_pro_zh: {
    name: 'Hiyori Pro T10',
    path: '/live2d/model/hiyori_pro_zh/runtime/hiyori_pro_t10.model3.json',
    description: '自动检测的模型',
    exists: true
  },
  miku_pro_jp: {
    name: 'Miku Sample T04',
    path: '/live2d/model/miku_pro_jp/runtime/miku_sample_t04.model3.json',
    description: '自动检测的模型',
    exists: true
  },
  natori_pro_jp: {
    name: 'Natori Pro T04',
    path: '/live2d/model/natori_pro_jp/runtime/natori_pro_t04.model3.json',
    description: '自动检测的模型',
    exists: true
  }
}

/**
 * 获取所有有效（存在）的模型配置
 */
export function getValidAutoModels(): Record<string, ModelConfig> {
  return Object.fromEntries(
    Object.entries(autoModelConfig).filter(([_, config]) => config.exists)
  )
}

/**
 * 获取所有模型 ID 列表
 */
export function getAutoModelIds(): string[] {
  return Object.keys(autoModelConfig)
}

/**
 * 获取所有有效模型的 ID 列表
 */
export function getValidAutoModelIds(): string[] {
  return Object.entries(autoModelConfig)
    .filter(([_, config]) => config.exists)
    .map(([id]) => id)
}

/**
 * 获取模型数量
 */
export function getAutoModelCount(): number {
  return Object.keys(autoModelConfig).length
}

/**
 * 检查模型是否存在
 */
export function hasAutoModel(id: string): boolean {
  return id in autoModelConfig
}

/**
 * 验证指定模型文件是否实际存在
 */
export function validateModelExists(id: string): boolean {
  const model = autoModelConfig[id]
  return model?.exists ?? false
}
