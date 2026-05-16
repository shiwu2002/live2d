interface Window {
  electronAPI?: {
    setWindowSize: (width: number, height: number) => Promise<void>
    getPlatform: () => Promise<string>
    isElectron: boolean
    startDrag: () => void
    dragMove: (dx: number, dy: number) => void
    endDrag: () => void
    minimizeWindow: () => Promise<void>
    closeWindow: () => Promise<void>
    setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => Promise<void>
  }
}
