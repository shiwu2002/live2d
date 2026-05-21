const { app, BrowserWindow, ipcMain, screen, session } = require('electron')
const path = require('path')

let mainWindow
let isDragging = false
let dragOffset = { x: 0, y: 0 }
let mouseIgnoreActive = false

// 主进程鼠标穿透轮询（不依赖渲染进程 mousemove/焦点事件）
let penetrationPollInterval = null
let backgroundHidden = false
let lastPollIgnoreState = null
let interactiveUIActive = false
const TOOLBAR_ZONE_HEIGHT = 140 // 底部工具栏区域高度
const POLL_INTERVAL_MS = 100

// ==================== 全局应用切换监听 ====================
let appSwitchMonitorInterval = null
let lastForegroundWindowHandle = null
let isAppSwitchMonitorRunning = false
const APP_SWITCH_CHECK_INTERVAL = 500 // 每 500ms 检查一次前台窗口变化

/**
 * 获取当前前台窗口的句柄（仅 Windows 平台）
 * 使用 user32.dll 的 GetForegroundWindow API
 */
function getForegroundWindowHandle() {
  if (process.platform !== 'win32') {
    return null // 非 Windows 平台暂不支持
  }

  try {
    const { execSync } = require('child_process')
    
    // 使用 PowerShell 调用 Windows API 获取前台窗口句柄
    const result = execSync(
      'powershell -Command "Add-Type \'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow(); }\' -PassThru | ForEach-Object { $_::GetForegroundWindow() }"',
      { encoding: 'utf8', timeout: 100 }
    ).trim()
    
    return result || null
  } catch (error) {
    console.error('[AppSwitch] 获取前台窗口失败:', error.message)
    return null
  }
}

/**
 * 启动全局应用切换监听
 * 当检测到用户切换到其他应用时，通知渲染进程执行截图
 */
function startAppSwitchMonitor() {
  if (isAppSwitchMonitorRunning || !mainWindow) return
  
  isAppSwitchMonitorRunning = true
  console.log('[AppSwitch] ✓ 启动全局应用切换监听（每', APP_SWITCH_CHECK_INTERVAL, 'ms 检查一次）')

  // 初始化时记录当前窗口
  lastForegroundWindowHandle = mainWindow.id.toString()

  appSwitchMonitorInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      stopAppSwitchMonitor()
      return
    }

    try {
      const currentForegroundHandle = getForegroundWindowHandle()
      
      // 如果获取不到句柄，跳过本次检查
      if (!currentForegroundHandle) return

      // 检查是否发生了窗口切换
      const windowChanged = currentForegroundHandle !== lastForegroundWindowHandle
      
      if (windowChanged && lastForegroundWindowHandle !== null) {
        const isOurWindowFocused = currentForegroundHandle === mainWindow.id.toString()
        
        if (!isOurWindowFocused) {
          // 用户从我们的应用切换到了其他应用
          console.log('[AppSwitch] 🎯 检测到用户切换到其他应用！')
          console.log('[AppSwitch]   上次窗口:', lastForegroundWindowHandle)
          console.log('[AppSwitch]   当前窗口:', currentForegroundHandle)
          
          // 通知渲染进程：用户已切换到其他应用，立即截图
          mainWindow.webContents.send('app-switched-to-other')
        } else {
          // 用户切回了我们的应用
          console.log('[AppSwitch] 🔄 用户切回了本应用')
          mainWindow.webContents.send('app-switched-back')
        }
      }

      // 更新上次记录
      lastForegroundWindowHandle = currentForegroundHandle
    } catch (error) {
      console.error('[AppSwitch] 监听出错:', error.message)
    }
  }, APP_SWITCH_CHECK_INTERVAL)
}

/**
 * 停止全局应用切换监听
 */
function stopAppSwitchMonitor() {
  if (appSwitchMonitorInterval) {
    clearInterval(appSwitchMonitorInterval)
    appSwitchMonitorInterval = null
  }
  isAppSwitchMonitorRunning = false
  lastForegroundWindowHandle = null
  console.log('[AppSwitch] ✗ 已停止全局应用切换监听')
}

function startPenetrationPolling() {
  backgroundHidden = true
  if (penetrationPollInterval) return
  penetrationPollInterval = setInterval(() => {
    if (!mainWindow || !backgroundHidden) return
    try {
      const cursor = screen.getCursorScreenPoint()
      const bounds = mainWindow.getBounds()
      const [winX, winY] = mainWindow.getPosition()
      const relativeY = cursor.y - winY
      // 仅当鼠标在窗口范围内才管理穿透
      const insideWindow =
        cursor.x >= winX && cursor.x <= winX + bounds.width &&
        cursor.y >= winY && cursor.y <= winY + bounds.height
      if (!insideWindow) return
      const inToolbarZone = relativeY > bounds.height - TOOLBAR_ZONE_HEIGHT
      const shouldIgnore = !inToolbarZone && !interactiveUIActive
      if (shouldIgnore !== lastPollIgnoreState) {
        lastPollIgnoreState = shouldIgnore
        mouseIgnoreActive = shouldIgnore
        mainWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true })
      }
    } catch (_) { /* 忽略轮询中的错误 */ }
  }, POLL_INTERVAL_MS)
}

function stopPenetrationPolling() {
  backgroundHidden = false
  if (penetrationPollInterval) {
    clearInterval(penetrationPollInterval)
    penetrationPollInterval = null
  }
  lastPollIgnoreState = null
  if (mainWindow && !mainWindow.isDestroyed()) {
    mouseIgnoreActive = false
    mainWindow.setIgnoreMouseEvents(false)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 200,
    minHeight: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口失焦时通知渲染进程
  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('window-blurred')
  })

  // 窗口恢复焦点时通知渲染进程
  mainWindow.on('focus', () => {
    mainWindow?.webContents.send('window-focused')
  })

  mainWindow.on('closed', () => {
    stopPenetrationPolling()
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 处理所有到 shiwu.shop 的请求，解决 CORS 跨域问题
  const targetUrls = [
    'https://shiwu.shop/*',
    'http://shiwu.shop/*',
    'wss://shiwu.shop/*',
    'ws://shiwu.shop/*'
  ]

  // 清除缓存，确保使用最新的 CORS 配置
  session.defaultSession.clearCache()
  session.defaultSession.clearStorageData({
    storages: ['cookies', 'localStorage']
  })

  // 1. 修改请求头：伪造 Origin 和 Referer，绕过服务器的 CORS 检查
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: targetUrls },
    (details, callback) => {
      // 移除可能导致问题的原始 Origin
      delete details.requestHeaders['Origin']
      delete details.requestHeaders['Referer']

      // 设置伪造的请求头
      details.requestHeaders['Origin'] = 'https://shiwu.shop'
      details.requestHeaders['Referer'] = 'https://shiwu.shop/'

      console.log('[Electron] 修改请求头:', details.url)

      callback({ requestHeaders: details.requestHeaders })
    }
  )

  // 2. 修改响应头：强制添加 CORS 允许头，确保前端能正常读取响应
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: targetUrls },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }

      // 删除服务器返回的原始 CORS 头（避免冲突）
      delete responseHeaders['access-control-allow-origin']
      delete responseHeaders['Access-Control-Allow-Origin']
      delete responseHeaders['access-control-allow-methods']
      delete responseHeaders['Access-Control-Allow-Methods']
      delete responseHeaders['access-control-allow-headers']
      delete responseHeaders['Access-Control-Allow-Headers']
      delete responseHeaders['access-control-allow-credentials']
      delete responseHeaders['Access-Control-Allow-Credentials']
      delete responseHeaders['access-control-max-age']
      delete responseHeaders['Access-Control-Max-Age']

      // 设置新的 CORS 响应头
      responseHeaders['Access-Control-Allow-Origin'] = ['*']
      responseHeaders['Access-Control-Allow-Credentials'] = ['true']
      responseHeaders['Access-Control-Allow-Methods'] = [
        'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'
      ]
      responseHeaders['Access-Control-Allow-Headers'] = [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'Pragma'
      ]
      responseHeaders['Access-Control-Max-Age'] = ['86400']

      console.log('[Electron] 修改响应头:', details.url, details.statusCode)

      callback({ responseHeaders })
    }
  )

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('set-window-size', (_event, width, height) => {
  if (mainWindow) {
    mainWindow.setSize(parseInt(width), parseInt(height))
  }
})

ipcMain.handle('get-platform', () => process.platform)

ipcMain.on('start-drag', () => {
  if (!mainWindow) return
  const pos = mainWindow.getPosition()
  isDragging = true
  dragOffset.x = pos[0]
  dragOffset.y = pos[1]
})

ipcMain.on('drag-move', (_event, dx, dy) => {
  if (!isDragging || !mainWindow) return
  mainWindow.setPosition(
    Math.round(dragOffset.x + dx),
    Math.round(dragOffset.y + dy)
  )
})

ipcMain.on('end-drag', () => {
  isDragging = false
})

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize()
})

ipcMain.handle('close-window', () => {
  mainWindow?.close()
})

// 渲染进程快速路径（fire-and-forget，零延迟）
ipcMain.on('set-ignore-mouse-events', (_event, ignore, options) => {
  if (mainWindow) {
    mouseIgnoreActive = ignore
    mainWindow.setIgnoreMouseEvents(ignore, options)
  }
})

// 背景隐藏/显示时启停主进程轮询（安全网，不依赖渲染进程事件）
ipcMain.on('set-background-hidden', (_event, hidden) => {
  if (hidden) {
    startPenetrationPolling()
  } else {
    stopPenetrationPolling()
  }
})

// 渲染进程通知交互界面状态变化（弹窗打开/关闭时调用）
ipcMain.on('set-interactive-ui-active', (_event, active) => {
  interactiveUIActive = active
  // 立即修正穿透状态
  if (backgroundHidden && mainWindow && !mainWindow.isDestroyed()) {
    const shouldIgnore = !interactiveUIActive
    if (shouldIgnore !== lastPollIgnoreState) {
      lastPollIgnoreState = shouldIgnore
      mouseIgnoreActive = shouldIgnore
      mainWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true })
    }
  }
})

ipcMain.on('focus-window', () => {
  if (mainWindow) {
    mainWindow.focus()
  }
})

// ==================== 全局应用切换监听 IPC 接口 ====================

// 启动全局应用切换监听
ipcMain.on('start-app-switch-monitor', () => {
  console.log('[IPC] 收到启动应用切换监听请求')
  startAppSwitchMonitor()
})

// 停止全局应用切换监听
ipcMain.on('stop-app-switch-monitor', () => {
  console.log('[IPC] 收到停止应用切换监听请求')
  stopAppSwitchMonitor()
})

// 查询监听状态
ipcMain.handle('is-app-switch-monitor-running', () => {
  return isAppSwitchMonitorRunning
})
