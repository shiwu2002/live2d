/**
 * Live2D 模型配置文件（自动生成）
 * 生成时间: 2026-01-08T17:19:50.413Z
 * 
 * ⚠️ 警告：此文件由 scripts/scan-models.js 自动生成
 * 如需修改配置，请编辑 src/config/models.ts 或重新运行扫描脚本
 */

export interface ModelConfig {
  name: string
  path: string
  description?: string
}

export const autoModelConfig: Record<string, ModelConfig> = {
  banerwei_3: {
    name: 'Banerwei 3',
    path: '/model/banerwei_3/banerwei_3.model3.json',
    description: '自动检测的模型'
  },
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
  Epsilon: {
    name: 'Epsilon',
    path: '/model/Epsilon/runtime/Epsilon.model3.json',
    description: '自动检测的模型'
  },
  Gantzert_Felixander: {
    name: 'Gantzert Felixander',
    path: '/model/Gantzert_Felixander/runtime/Gantzert_Felixander.model3.json',
    description: '自动检测的模型'
  },
  haru: {
    name: 'Haru',
    path: '/model/haru/runtime/haru.model3.json',
    description: '自动检测的模型'
  },
  haru_greeter_pro_jp: {
    name: 'Haru Greeter T03',
    path: '/model/haru_greeter_pro_jp/runtime/haru_greeter_t03.model3.json',
    description: '自动检测的模型'
  },
  hiyori_pro_zh: {
    name: 'Hiyori Pro T10',
    path: '/model/hiyori_pro_zh/runtime/hiyori_pro_t10.model3.json',
    description: '自动检测的模型'
  },
  miku_pro_jp: {
    name: 'Miku Sample T04',
    path: '/model/miku_pro_jp/runtime/miku_sample_t04.model3.json',
    description: '自动检测的模型'
  },
  natori_pro_jp: {
    name: 'Natori Pro T04',
    path: '/model/natori_pro_jp/runtime/natori_pro_t04.model3.json',
    description: '自动检测的模型'
  }
}

/**
 * 获取所有模型 ID 列表
 */
export function getAutoModelIds(): string[] {
  return Object.keys(autoModelConfig)
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
