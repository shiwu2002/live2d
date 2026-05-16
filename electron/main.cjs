const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')

let mainWindow
let isDragging = false
let dragOffset = { x: 0, y: 0 }
let mouseIgnoreActive = false

// 主进程鼠标穿透轮询（不依赖渲染进程 mousemove/焦点事件）
let penetrationPollInterval = null
let backgroundHidden = false
let lastPollIgnoreState = null
const TOOLBAR_ZONE_HEIGHT = 140 // 底部工具栏区域高度
const POLL_INTERVAL_MS = 100

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
      const shouldIgnore = !inToolbarZone
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
  if (mainWindow) {
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
      nodeIntegration: false
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

app.whenReady().then(createWindow)

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

ipcMain.on('focus-window', () => {
  if (mainWindow) {
    mainWindow.focus()
  }
})
