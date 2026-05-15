const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', width, height),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,
  startDrag: () => ipcRenderer.send('start-drag'),
  dragMove: (dx, dy) => ipcRenderer.send('drag-move', dx, dy),
  endDrag: () => ipcRenderer.send('end-drag'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window')
})
