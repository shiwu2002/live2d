/**
 * Live2D 模型自动扫描脚本
 * 自动扫描 public/model/ 目录并生成模型配置文件
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '..')
const MODEL_DIR = path.join(ROOT_DIR, 'public', 'model')
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'config', 'auto-models.ts')

/**
 * 递归查找目录中的所有 .model3.json 文件
 */
function findModelFiles(dir, baseDir = dir) {
  const results = []
  
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  目录不存在: ${dir}`)
    return results
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      // 递归搜索子目录
      results.push(...findModelFiles(fullPath, baseDir))
    } else if (entry.isFile() && entry.name.endsWith('.model3.json')) {
      // 找到模型配置文件
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/')
      results.push({
        fileName: entry.name,
        fullPath,
        relativePath,
        dirName: path.basename(path.dirname(fullPath))
      })
    }
  }

  return results
}

/**
 * 从模型文件名生成友好的显示名称
 */
function generateDisplayName(fileName, dirName) {
  // 移除 .model3.json 后缀
  let name = fileName.replace('.model3.json', '')
  
  // 如果文件名和目录名相同，使用目录名
  if (name === dirName) {
    name = dirName
  }
  
  // 处理常见的命名模式
  name = name
    .replace(/_/g, ' ')           // 下划线转空格
    .replace(/\b\w/g, c => c.toUpperCase())  // 首字母大写
  
  return name
}

/**
 * 生成模型配置的 ID
 */
function generateModelId(fileName, dirName, fullPath) {
  // 如果目录名是 runtime，使用父目录名
  if (dirName === 'runtime') {
    const parentDir = path.basename(path.dirname(path.dirname(fullPath)))
    dirName = parentDir
  }
  
  // 使用目录名作为 ID（更稳定）
  let id = dirName
  
  // 清理 ID（移除特殊字符，保留字母数字和下划线）
  id = id.replace(/[^a-zA-Z0-9_]/g, '_')
  
  return id
}

/**
 * 生成 TypeScript 配置文件内容
 */
function generateConfigFile(models) {
  const timestamp = new Date().toISOString()
  
  let content = `/**
 * Live2D 模型配置文件（自动生成）
 * 生成时间: ${timestamp}
 * 
 * ⚠️ 警告：此文件由 scripts/scan-models.js 自动生成
 * 如需修改配置，请编辑 src/config/models.ts 或重新运行扫描脚本
 */

export interface ModelConfig {
  name: string
  path: string
  description?: string
}

export const autoModelConfig: Record<string, ModelConfig> = {\n`

  // 按 ID 排序
  const sortedModels = models.sort((a, b) => a.id.localeCompare(b.id))

  sortedModels.forEach((model, index) => {
    content += `  ${model.id}: {\n`
    content += `    name: '${model.name}',\n`
    content += `    path: '/model/${model.relativePath}',\n`
    content += `    description: '自动检测的模型'\n`
    content += `  }${index < sortedModels.length - 1 ? ',' : ''}\n`
  })

  content += `}

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
`

  return content
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始扫描 Live2D 模型...\n')
  console.log(`📁 扫描目录: ${MODEL_DIR}\n`)

  // 查找所有模型文件
  const modelFiles = findModelFiles(MODEL_DIR)

  if (modelFiles.length === 0) {
    console.log('❌ 未找到任何 .model3.json 文件')
    console.log('   请确保模型文件放置在 public/model/ 目录下\n')
    process.exit(1)
  }

  console.log(`✅ 找到 ${modelFiles.length} 个模型文件:\n`)

  // 处理模型信息
  const models = modelFiles.map(file => {
    const id = generateModelId(file.fileName, file.dirName, file.fullPath)
    const name = generateDisplayName(file.fileName, file.dirName)
    
    console.log(`   • ${id}`)
    console.log(`     名称: ${name}`)
    console.log(`     路径: /model/${file.relativePath}`)
    console.log()

    return {
      id,
      name,
      relativePath: file.relativePath,
      dirName: file.dirName
    }
  })

  // 生成配置文件
  const configContent = generateConfigFile(models)

  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, configContent, 'utf-8')

  console.log(`\n✅ 配置文件已生成: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`)
  console.log(`📊 总计: ${models.length} 个模型\n`)
  console.log('💡 使用方法:')
  console.log('   1. 在代码中导入: import { autoModelConfig } from \'./config/auto-models\'')
  console.log('   2. 或合并到现有配置: import { modelConfig } from \'./config/models\'')
  console.log('   3. 运行 npm run dev 查看效果\n')
}

// 运行脚本
try {
  main()
} catch (error) {
  console.error('❌ 脚本执行失败:', error.message)
  process.exit(1)
}
