let _isNativeApp = false
let _platform = 'web'

export const isNativeApp = () => _isNativeApp
export const platform = () => _platform

async function loadNativeModules() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    _isNativeApp = Capacitor.isNativePlatform()
    _platform = Capacitor.getPlatform()
    return { Capacitor }
  } catch {
    console.warn('[Capacitor] Native modules not available, running in web/electron mode')
    return null
  }
}

export async function initCapacitor(): Promise<void> {
  await loadNativeModules()

  if (!_isNativeApp) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#FFDEE9' })
  } catch {
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
  }

  try {
    const { App: CapApp } = await import('@capacitor/app')
    CapApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (!canGoBack) {
        CapApp.exitApp()
      } else {
        window.history.back()
      }
    })
  } catch {
  }

  if (_platform === 'ios') {
    document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)')
    document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)')
  }

  if (_platform === 'android') {
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

  console.log(`[Capacitor] Initialized on ${_platform}`)
}

export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  if (!_isNativeApp) return { top: 0, bottom: 0, left: 0, right: 0 }

  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
  }
}
