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
  },

  // ==================== 全局应用切换监听 API ====================
  
  /**
   * 启动全局应用切换监听
   * 当用户从本应用切换到其他应用时，会触发 'app-switched-to-other' 事件
   */
  startAppSwitchMonitor: () => {
    console.log('[Preload] 启动应用切换监听')
    ipcRenderer.send('start-app-switch-monitor')
  },

  /**
   * 停止全局应用切换监听
   */
  stopAppSwitchMonitor: () => {
    console.log('[Preload] 停止应用切换监听')
    ipcRenderer.send('stop-app-switch-monitor')
  },

  /**
   * 查询监听是否正在运行
   */
  isAppSwitchMonitorRunning: () => {
    return ipcRenderer.invoke('is-app-switch-monitor-running')
  },

  /**
   * 监听用户切换到其他应用的事件
   * @param {Function} callback - 回调函数，无参数
   */
  onAppSwitchedToOther: (callback) => {
    console.log('[Preload] 注册 app-switched-to-other 监听器')
    ipcRenderer.on('app-switched-to-other', callback)
  },

  /**
   * 监听用户切回本应用的事件
   * @param {Function} callback - 回调函数，无参数
   */
  onAppSwitchedBack: (callback) => {
    console.log('[Preload] 注册 app-switched-back 监听器')
    ipcRenderer.on('app-switched-back', callback)
  },

  /**
   * 移除应用切换事件监听器
   * @param {string} event - 事件名称 ('app-switched-to-other' 或 'app-switched-back')
   * @param {Function} callback - 要移除的回调函数
   */
  removeAppSwitchListener: (event, callback) => {
    ipcRenderer.removeListener(event, callback)
  }
})
