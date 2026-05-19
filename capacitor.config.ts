import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.live2d.desktoppet',
  appName: 'Live2D桌宠',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFDEE9',
      showSpinner: false
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FF6B9D'
    }
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    contentInset: 'automatic'
  }
}

export default config
