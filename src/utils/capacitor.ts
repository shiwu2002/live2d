import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { App } from '@capacitor/app'

export const isNativeApp = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform()

export async function initCapacitor(): Promise<void> {
  if (!isNativeApp) return

  await StatusBar.setStyle({ style: Style.Light })
  await StatusBar.setBackgroundColor({ color: '#FFDEE9' })

  await SplashScreen.hide()

  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp()
    } else {
      window.history.back()
    }
  })

  if (platform === 'ios') {
    document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)')
    document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)')
  }

  if (platform === 'android') {
    const meta = document.createElement('meta')
    meta.name = 'viewport'
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    const existing = document.querySelector('meta[name="viewport"]')
    if (existing) {
      existing.replaceWith(meta)
    } else {
      document.head.appendChild(meta)
    }
  }

  console.log(`[Capacitor] Initialized on ${platform}`)
}

export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  if (!isNativeApp) return { top: 0, bottom: 0, left: 0, right: 0 }

  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
  }
}
