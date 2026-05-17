const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,
  startDrag: () => ipcRenderer.send('start-drag'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  endDrag: () => ipcRenderer.send('end-drag'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  // 快速路径（fire-and-forget）
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  // 启停主进程轮询（安全网）
  setBackgroundHidden: (hidden) => ipcRenderer.send('set-background-hidden', hidden),
  // 通知主进程交互界面状态变化
  setInteractiveUIActive: (active) => ipcRenderer.send('set-interactive-ui-active', active),
  focusWindow: () => ipcRenderer.send('focus-window'),
  // 主进程焦点事件
  onWindowBlurred: (callback) => {
    ipcRenderer.on('window-blurred', callback)
  },
  onWindowFocused: (callback) => {
    ipcRenderer.on('window-focused', callback)
  }
})
