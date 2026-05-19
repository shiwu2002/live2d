import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initCapacitor } from './utils/capacitor'

async function bootstrap() {
  await initCapacitor()
  createApp(App).mount('#app')
}

bootstrap()
