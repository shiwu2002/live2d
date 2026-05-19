let Capacitor: any
let StatusBar: any
let SplashScreen: any
let App: any

try {
  const core = await import('@capacitor/core')
  Capacitor = core.Capacitor
  const statusBar = await import('@capacitor/status-bar')
  StatusBar = statusBar.StatusBar
  const splashScreen = await import('@capacitor/splash-screen')
  SplashScreen = splashScreen.SplashScreen
  const app = await import('@capacitor/app')
  App = app.App
} catch {
  console.warn('[Capacitor] Native modules not available, running in web/electron mode')
}

export const isNativeApp = Capacitor?.isNativePlatform() ?? false
export const platform = Capacitor?.getPlatform() ?? 'web'

export async function initCapacitor(): Promise<void> {
  if (!isNativeApp || !Capacitor) return

  const { Style } = await import('@capacitor/status-bar')
  await StatusBar.setStyle({ style: Style.Light })
  await StatusBar.setBackgroundColor({ color: '#FFDEE9' })

  await SplashScreen.hide()

  App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
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
