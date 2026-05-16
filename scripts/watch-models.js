/**
 * Live2D 模型热重载监听器
 * 监控 public/model/ 目录变化，自动重新扫描并刷新浏览器
 *
 * 使用方法:
 *   npm run watch-models    # 启动监控
 *   Ctrl+C                  # 停止监控
 */

import { spawn, exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT_DIR = path.resolve(__dirname, '..')
const MODEL_DIR = path.join(ROOT_DIR, 'public', 'model')

// 防抖延迟（毫秒）
const DEBOUNCE_DELAY = 1000

// 监听状态
let isScanning = false
let debounceTimer = null
let watcherProcess = null

console.log('🔥 Live2D 模型热重载监听器')
console.log('=' .repeat(50))
console.log(`📁 监控目录: ${MODEL_DIR}`)
console.log(`⏱️  防抖延迟: ${DEBOUNCE_DELAY}ms`)
console.log('')
console.log('💡 提示:')
console.log('   • 添加/删除模型文件夹会自动触发重新扫描')
console.log('   • 扫描完成后浏览器将自动刷新')
console.log('   • 按 Ctrl+C 停止监听\n')

/**
 * 使用 chokidar 或 Node.js 内置 fs.watch 监控目录
 */
async function startWatching() {
  // 尝试使用 chokidar（如果已安装）
  try {
    const chokidar = await import('chokidar').catch(() => null)

    if (chokidar) {
      console.log('✅ 使用 chokidar 进行文件监控（推荐）\n')
      startChokidarWatcher(chokidar.default || chokidar)
      return
    }
  } catch (error) {
    console.log('⚠️  chokidar 未安装，使用内置 fs.watch\n')
  }

  // 回退到 Node.js 内置的 fs.watch
  startFsWatch()
}

/**
 * 使用 chokidar 监控（跨平台、更可靠）
 */
function startChokidarWatcher(chokidar) {
  console.log('🎯 开始监控...\n')

  watcherProcess = chokidar.watch(MODEL_DIR, {
    ignored: /(^|[\/\\])\../,  // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true,        // 忽略初始扫描
    depth: 3,                   // 监控深度
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  })

  // 监听所有事件
  watcherProcess
    .on('add', handleFileChange('添加'))
    .on('addDir', handleFileChange('添加目录'))
    .on('change', handleFileChange('修改'))
    .on('unlink', handleFileChange('删除'))
    .on('unlinkDir', handleFileChange('删除目录'))
    .on('error', (error) => {
      console.error(`❌ 监控错误: ${error.message}`)
    })
    .on('ready', () => {
      console.log('✅ 监控已就绪，等待文件变化...\n')
    })
}

/**
 * 使用 Node.js 内置 fs.watch（备用方案）
 */
function startFsWatch() {
  console.log('🎯 开始监控（使用 fs.watch）...\n')
  console.warn('⚠️  注意: fs.watch 在某些系统上可能不稳定')
  console.warn('   建议运行: npm install --save-dev chokidar\n')

  try {
    fs.watch(MODEL_DIR, { recursive: true }, (eventType, filename) => {
      if (filename) {
        console.log(`📝 检测到变化: ${eventType} - ${filename}`)
        debouncedRescan()
      }
    })

    console.log('✅ 监控已启动\n')
  } catch (error) {
    console.error('❌ 启动监控失败:', error.message)
    process.exit(1)
  }
}

/**
 * 创建防抖的事件处理器
 */
function handleFileChange(action) {
  return (filePath) => {
    const relativePath = path.relative(MODEL_DIR, filePath)
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] ${action}: ${relativePath}`)

    // 只在相关文件变化时触发重新扫描
    if (isModelRelated(filePath)) {
      debouncedRescan()
    }
  }
}

/**
 * 判断是否是模型相关的文件变化
 */
function isModelRelated(filePath) {
  const ext = path.extname(filePath).toLowerCase()

  // 关注这些类型的文件
  const watchedExtensions = [
    '.model3.json',  // 模型配置
    '.moc3',         // 模型数据
    '.png',          // 纹理
    '.jpg',
    '.jpeg',
    '.exp3.json',    // 表情
    '.motion3.json', // 动作
    '.physics3.json', // 物理配置
    '.pose3.json'     // 姿势配置
  ]

  return watchedExtensions.includes(ext) ||
         filePath.endsWith('.model3.json') ||
         path.basename(filePath) === '.model3.json'
}

/**
 * 防抖处理：避免频繁触发
 */
function debouncedRescan() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  console.log('⏳ 等待稳定...')

  debounceTimer = setTimeout(() => {
    rescanAndRefresh()
  }, DEBOUNCE_DELAY)
}

/**
 * 重新扫描模型并触发浏览器刷新
 */
async function rescanAndRefresh() {
  if (isScanning) {
    console.log('⚠️  上次扫描尚未完成，跳过本次')
    return
  }

  isScanning = true
  console.log('\n🔍 开始重新扫描模型...\n')

  return new Promise((resolve) => {
    // 运行扫描脚本
    const scanProcess = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'scan-models'],
      {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        shell: true
      }
    )

    scanProcess.on('close', (code) => {
      isScanning = false

      if (code === 0) {
        console.log('\n✅ 扫描完成！尝试刷新浏览器...\n')

        // 尝试通过 Vite HMR 刷新或发送信号给 Electron
        triggerBrowserRefresh()
      } else {
        console.error('\n❌ 扫描失败')
      }

      resolve()
    })

    scanProcess.on('error', (error) => {
      isScanning = false
      console.error('❌ 扫描进程错误:', error.message)
      resolve()
    })
  })
}

/**
 * 触发浏览器刷新
 */
function triggerBrowserRefresh() {
  // 方法1: 如果 Vite 开发服务器正在运行，通过 WebSocket 触发 HMR
  try {
    fetch('http://localhost:5173/__vite_hmr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'full-reload'
      })
    }).then(response => {
      if (response.ok) {
        console.log('✅ 已通知 Vite 服务器刷新页面')
      } else {
        console.log('ℹ️  Vite HMR 未响应，可能需要手动刷新浏览器')
      }
    }).catch(() => {
      console.log('ℹ️  无法连接到 Vite 服务器')
      console.log('   请手动刷新浏览器 (Ctrl+Shift+R)')
    })
  } catch (error) {
    console.log('ℹ️  刷新请求失败，请手动刷新浏览器')
  }
}

/**
 * 清理资源并退出
 */
function cleanup() {
  console.log('\n\n🛑 停止监控...')

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  if (watcherProcess && typeof watcherProcess.close === 'function') {
    watcherProcess.close().then(() => {
      console.log('✅ 监控已停止')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
}

// 处理退出信号
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('exit', cleanup)

// 启动监控
startWatching().catch((error) => {
  console.error('❌ 启动失败:', error.message)
  process.exit(1)
})
