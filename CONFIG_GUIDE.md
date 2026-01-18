# 配置指南

本项目使用统一的配置文件来管理所有服务的地址和配置。

## 配置文件位置

所有配置都集中在一个文件中：
```
src/config/index.ts
```

## 配置文件结构

配置文件包含以下几个部分：

### 1. 环境配置

支持开发环境和生产环境的自动切换：

```typescript
// 开发环境配置
const developmentConfig: EnvConfig = {
  env: 'development',
  apiBaseUrl: 'http://localhost:8080',
  wsBaseUrl: 'ws://118.31.118.176:80',
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login'
  }
}

// 生产环境配置
const productionConfig: EnvConfig = {
  env: 'production',
  apiBaseUrl: 'https://api.yourapp.com',  // 部署时需要修改
  wsBaseUrl: 'ws://118.31.118.176:80',
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login'
  }
}
```

### 2. 聊天配置

WebSocket 连接和聊天相关的默认配置：

```typescript
export const defaultChatConfig: ChatConfig = {
  baseUrl: 'ws://118.31.118.176:80',
  openid: 'test_user_001',
  aiSessionId: `session_${Date.now()}`,
  mode: 'text',
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000
}
```

### 3. 音频配置

音频录制和播放的默认配置：

```typescript
export const defaultAudioConfig: AudioConfig = {
  sampleRate: 16000,
  bitDepth: 16,
  channels: 1,
  endianness: 'little'
}
```

## 如何使用配置

### 获取 API 基础地址

```typescript
import { getApiBaseUrl } from './config'

const apiUrl = getApiBaseUrl()
// 开发环境: 'http://localhost:8080'
// 生产环境: 'https://api.yourapp.com'
```

### 获取 WebSocket URL

```typescript
import { getWebSocketUrl } from './config'

// 获取聊天服务的 WebSocket URL
const chatWsUrl = getWebSocketUrl('chat')
// 结果: 'ws://118.31.118.176:80/ws/chat'

// 获取语音通话的 WebSocket URL
const voiceWsUrl = getWebSocketUrl('voice')
// 结果: 'ws://118.31.118.176:80/ws/voice'

// 获取扫码登录的 WebSocket URL
const qrcodeWsUrl = getWebSocketUrl('qrcodeLogin')
// 结果: 'ws://118.31.118.176:80/ws/qrcode-login'
```

### 获取聊天配置

```typescript
import { getChatConfig, generateSessionId } from './config'

// 使用默认配置
const config = getChatConfig()

// 覆盖部分配置
const customConfig = getChatConfig({
  openid: 'user_12345',
  aiSessionId: generateSessionId(),
  mode: 'voice'
})
```

### 获取所有 WebSocket 端点

```typescript
import { getAllWebSocketUrls } from './config'

const urls = getAllWebSocketUrls()
// 返回:
// {
//   chat: 'ws://118.31.118.176:80/ws/chat',
//   voice: 'ws://118.31.118.176:80/ws/voice',
//   qrcodeLogin: 'ws://118.31.118.176:80/ws/qrcode-login'
// }
```

## 环境切换

配置会根据 Vite 的环境变量自动切换：

- 开发环境：`npm run dev` → 使用 `developmentConfig`
- 生产环境：`npm run build` → 使用 `productionConfig`

## 修改配置

### 修改开发环境地址

编辑 `src/config/index.ts`，修改 `developmentConfig`：

```typescript
const developmentConfig: EnvConfig = {
  env: 'development',
  apiBaseUrl: 'http://your-dev-api:8080',  // 修改此处
  wsBaseUrl: 'ws://your-dev-ws:80',         // 修改此处
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login'
  }
}
```

### 修改生产环境地址

编辑 `src/config/index.ts`，修改 `productionConfig`：

```typescript
const productionConfig: EnvConfig = {
  env: 'production',
  apiBaseUrl: 'https://your-prod-api.com',  // 修改此处
  wsBaseUrl: 'wss://your-prod-ws.com',       // 修改此处（建议使用 wss）
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login'
  }
}
```

### 修改 WebSocket 端点路径

如果后端的 WebSocket 端点路径不同，可以修改 `wsEndpoints`：

```typescript
wsEndpoints: {
  chat: '/api/websocket/chat',           // 修改聊天服务路径
  voice: '/api/websocket/voice',         // 修改语音服务路径
  qrcodeLogin: '/api/websocket/qrcode'   // 修改扫码登录路径
}
```

## 调试配置

在应用启动时，配置信息会自动打印到控制台：

```typescript
import { logEnvConfig } from './config'

logEnvConfig()
```

输出示例：
```
========== 环境配置 ==========
当前环境: development
API 基础地址: http://localhost:8080
WebSocket 基础地址: ws://118.31.118.176:80
WebSocket 端点:
  - 聊天服务: ws://118.31.118.176:80/ws/chat
  - 语音通话: ws://118.31.118.176:80/ws/voice
  - 扫码登录: ws://118.31.118.176:80/ws/qrcode-login
============================
```

## 注意事项

1. **生产环境地址**：部署前务必修改 `productionConfig` 中的地址
2. **WebSocket 协议**：生产环境建议使用 `wss://`（加密）而非 `ws://`
3. **HTTPS 限制**：如果前端使用 HTTPS，WebSocket 也必须使用 WSS
4. **跨域问题**：确保后端 API 和 WebSocket 服务允许前端域名的跨域访问
5. **端口配置**：如果服务运行在非标准端口，需要在 URL 中明确指定端口号

## 常见问题

### Q: 如何添加新的 WebSocket 服务端点？

A: 在 `EnvConfig` 接口的 `wsEndpoints` 中添加新端点：

```typescript
export interface EnvConfig {
  // ...
  wsEndpoints: {
    chat: string
    voice: string
    qrcodeLogin: string
    newService: string  // 添加新端点
  }
}
```

然后在配置中添加对应的路径：

```typescript
const developmentConfig: EnvConfig = {
  // ...
  wsEndpoints: {
    chat: '/ws/chat',
    voice: '/ws/voice',
    qrcodeLogin: '/ws/qrcode-login',
    newService: '/ws/new-service'  // 添加路径
  }
}
```

### Q: 如何在代码中判断当前环境？

A: 使用 `getEnvConfig()` 函数：

```typescript
import { getEnvConfig } from './config'

const config = getEnvConfig()
if (config.env === 'production') {
  // 生产环境特定逻辑
} else {
  // 开发环境特定逻辑
}
```

### Q: 配置修改后需要重启开发服务器吗？

A: 是的，配置文件的修改需要重启开发服务器才能生效。
