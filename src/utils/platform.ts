let _platform: 'web' | 'electron' = 'web'
let _isElectron = false

export type Platform = 'web' | 'electron'

export const getPlatform = (): Platform => _platform
export const isNativeApp = (): boolean => false
export const isElectron = (): boolean => _isElectron
export const isAndroid = (): boolean => false
export const isIOS = (): boolean => false
export const isWeb = (): boolean => _platform === 'web'

async function detectPlatform(): Promise<void> {
  if (!!(window as any).electronAPI?.isElectron) {
    _platform = 'electron'
    _isElectron = true
    return
  }

  _platform = 'web'
}

export async function initPlatform(): Promise<void> {
  await detectPlatform()
  console.log(`[Platform] Initialized on ${_platform}`)
}

export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  return { top: 0, bottom: 0, left: 0, right: 0 }
}
