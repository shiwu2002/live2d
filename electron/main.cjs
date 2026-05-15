const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

let mainWindow
let isDragging = false
let dragOffset = { x: 0, y: 0 }

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

  mainWindow.on('closed', () => {
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
