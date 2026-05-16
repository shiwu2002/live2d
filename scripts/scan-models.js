/**
 * Live2D 模型自动扫描脚本
 * 自动扫描 public/model/ 目录并生成模型配置文件
 * 支持自动读取 Vite 配置并生成正确路径
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
const VITE_CONFIG_FILE = path.join(ROOT_DIR, 'vite.config.ts')

/**
 * 读取 Vite 配置获取 base 路径
 */
function getViteBasePath() {
  try {
    if (!fs.existsSync(VITE_CONFIG_FILE)) {
      console.log('⚠️  未找到 vite.config.ts，使用默认路径 /')
      return '/'
    }

    const viteConfigContent = fs.readFileSync(VITE_CONFIG_FILE, 'utf-8')

    // 匹配多种 base 配置格式:
    // 1. 简单字符串: base: '/path/'
    // 2. 三元表达式: base: condition ? './' : '/path/'
    // 3. 变量引用: base: someVar

    // 先尝试匹配三元表达式中的默认值（最后一个字符串）
    const ternaryMatch = viteConfigContent.match(/base:\s*[^?]+\?\s*['"][^'"]+['"]\s*:\s*['"]([^'"]+)['"]/)
    if (ternaryMatch) {
      const basePath = ternaryMatch[1].replace(/\/$/, '')
      console.log(`✅ 已读取 Vite 配置 (三元表达式): base='${basePath}/'`)
      return basePath
    }

    // 匹配简单的字符串配置
    const simpleMatch = viteConfigContent.match(/base:\s*['"]([^'"]+)['"]/)
    if (simpleMatch) {
      const basePath = simpleMatch[1].replace(/\/$/, '')
      console.log(`✅ 已读取 Vite 配置: base='${basePath}/'`)
      return basePath
    }

    console.log('⚠️  未在 vite.config.ts 中找到 base 配置，使用默认路径 /')
    return '/'
  } catch (error) {
    console.warn('⚠️  读取 Vite 配置失败:', error.message)
    return '/'
  }
}

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
function generateConfigFile(models, basePath = '/') {
  const timestamp = new Date().toISOString()
  
  let content = `/**
 * Live2D 模型配置文件（自动生成）
 * 生成时间: ${timestamp}
 * 基础路径: ${basePath}/
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

export const autoModelConfig: Record<string, ModelConfig> = {\n`

  // 按 ID 排序
  const sortedModels = models.sort((a, b) => a.id.localeCompare(b.id))

  sortedModels.forEach((model, index) => {
    // 使用 Vite base 路径生成完整路径
    const fullPath = `${basePath}/model/${model.relativePath}`
    
    content += `  ${model.id}: {\n`
    content += `    name: '${model.name}',\n`
    content += `    path: '${fullPath}',\n`
    content += `    description: '自动检测的模型',\n`
    content += `    exists: ${model.fileExists}\n`
    content += `  }${index < sortedModels.length - 1 ? ',' : ''}\n`
  })

  content += `}

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
`

  return content
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始扫描 Live2D 模型...\n')
  console.log(`📁 扫描目录: ${MODEL_DIR}\n`)

  // 读取 Vite 配置获取 base 路径
  const basePath = getViteBasePath()
  console.log(`🌐 基础路径: ${basePath}/\n`)

  // 查找所有模型文件
  const modelFiles = findModelFiles(MODEL_DIR)

  if (modelFiles.length === 0) {
    console.log('❌ 未找到任何 .model3.json 文件')
    console.log('   请确保模型文件放置在 public/model/ 目录下\n')

    // 生成空配置文件
    const emptyConfig = generateConfigFile([], basePath)
    fs.writeFileSync(OUTPUT_FILE, emptyConfig, 'utf-8')
    console.log(`⚠️  已生成空配置文件: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`)
    process.exit(0)
  }

  console.log(`✅ 找到 ${modelFiles.length} 个模型文件:\n`)

  // 处理模型信息（包含文件存在性验证）
  const models = modelFiles.map(file => {
    const id = generateModelId(file.fileName, file.dirName, file.fullPath)
    const name = generateDisplayName(file.fileName, file.dirName)

    // 验证文件及其依赖是否存在
    const fileExists = validateModelDependencies(file.fullPath, MODEL_DIR)

    console.log(`   • ${id}`)
    console.log(`     名称: ${name}`)
    console.log(`     路径: ${basePath}/model/${file.relativePath}`)
    console.log(`     状态: ${fileExists ? '✅ 有效' : '⚠️  文件不完整'}`)
    console.log()

    return {
      id,
      name,
      relativePath: file.relativePath,
      dirName: file.dirName,
      fileExists,
      fullPath: file.fullPath
    }
  })

  // 统计有效/无效模型数量
  const validModels = models.filter(m => m.fileExists).length
  const invalidModels = models.length - validModels

  if (invalidModels > 0) {
    console.warn(`\n⚠️  警告: ${invalidModels} 个模型文件可能不完整`)
  }

  console.log(`\n📊 统计: ${validModels} 个有效模型, ${invalidModels} 个待检查\n`)

  // 生成配置文件（传入 Vite base 路径）
  const configContent = generateConfigFile(models, basePath)

  // 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, configContent, 'utf-8')

  console.log(`✅ 配置文件已生成: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`)
  console.log(`📝 总计: ${models.length} 个模型 (有效: ${validModels})\n`)
  console.log('💡 使用方法:')
  console.log('   1. 在代码中导入: import { autoModelConfig } from \'./config/auto-models\'')
  console.log('   2. 获取有效模型: import { getValidAutoModelIds } from \'./config/auto-models\'')
  console.log('   3. 运行 npm run dev 查看效果\n')
}

/**
 * 验证模型文件及其关键依赖是否存在
 */
function validateModelDependencies(modelFilePath, modelDir) {
  try {
    if (!fs.existsSync(modelFilePath)) return false

    // 读取 .model3.json 文件检查引用的资源
    const modelContent = JSON.parse(fs.readFileSync(modelFilePath, 'utf-8'))

    // 检查必需的文件
    const requiredFiles = []

    // 检查 FileReferences
    if (modelContent.FileReferences) {
      if (modelContent.FileReferences.Moc) {
        requiredFiles.push(modelContent.FileReferences.Moc)
      }
      if (modelContent.FileReferences.Textures && Array.isArray(modelContent.FileReferences.Textures)) {
        requiredFiles.push(...modelContent.FileReferences.Textures)
      }
    }

    // 获取模型文件所在目录
    const modelDirPath = path.dirname(modelFilePath)

    // 验证所有必需文件都存在
    for (const file of requiredFiles) {
      const fullPath = path.join(modelDirPath, file)
      if (!fs.existsSync(fullPath)) {
        console.warn(`     ⚠️  缺少依赖文件: ${file}`)
        return false
      }
    }

    return true
  } catch (error) {
    console.warn(`     ⚠️  验证失败: ${error.message}`)
    return false
  }
}

// 运行脚本
try {
  main()
} catch (error) {
  console.error('❌ 脚本执行失败:', error.message)
  process.exit(1)
}
