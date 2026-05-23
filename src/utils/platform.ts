export type Platform = 'web'

export const getPlatform = (): Platform => 'web'
export const isNativeApp = (): boolean => false
export const isElectron = (): boolean => false
export const isAndroid = (): boolean => false
export const isIOS = (): boolean => false
export const isWeb = (): boolean => true

export async function initPlatform(): Promise<void> {
  console.log('[Platform] Initialized on web')
}

export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  return { top: 0, bottom: 0, left: 0, right: 0 }
}
