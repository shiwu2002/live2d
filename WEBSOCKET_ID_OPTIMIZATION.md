# WebSocket ID 传递优化说明

## 优化概述

本次优化解决了 WebSocket 功能中用户 ID 传递不一致的问题，确保所有登录方式（扫码登录、用户名密码登录、恢复登录状态）都能正确传递用户 ID 到 WebSocket 服务。

## 问题分析

### 原始问题

1. **ID 字段命名不统一**：
   - `UserLoginInfo` 类型使用 `sessionId` 字段
   - `UserInfo` 类型使用 `aiSessionId` 字段
   - WebSocket 配置中参数为 `aiSessionId`

2. **扫码登录缺少 sessionId 传递**：
   ```typescript
   // 修复前
   const handleLoginSuccess = (userInfo: UserLoginInfo) => {
     wsConfig.value.openid = userInfo.openid
     // ❌ 缺少：wsConfig.value.aiSessionId = userInfo.sessionId
   }
   ```

3. **恢复登录状态缺少 sessionId 传递**：
   ```typescript
   // 修复前
   const checkLoginStatus = () => {
     wsConfig.value.openid = userInfo.openid
     // ❌ 缺少：wsConfig.value.aiSessionId = userInfo.sessionId
   }
   ```

## 解决方案

### ID 字段映射关系

建立清晰的 ID 字段映射规则：

```
UserLoginInfo.sessionId  ←→  wsConfig.aiSessionId  ←→  WebSocket 组件的 ai-session-id prop
UserLoginInfo.openid     ←→  wsConfig.openid       ←→  WebSocket 组件的 openid prop
```

### 修复内容

#### 1. 扫码登录处理函数

```typescript
// 修复后
const handleLoginSuccess = (userInfo: UserLoginInfo) => {
  console.log('扫码登录成功:', userInfo)
  isLoggedIn.value = true
  currentUser.value = userInfo
  
  // ✅ 更新 WebSocket 配置
  wsConfig.value.openid = userInfo.openid
  wsConfig.value.aiSessionId = userInfo.sessionId  // 新增：传递正确的 sessionId
  
  localStorage.setItem('userInfo', JSON.stringify(userInfo))
  localStorage.setItem('isLoggedIn', 'true')
  
  console.log('扫码登录状态已更新 - openid:', userInfo.openid, 'sessionId:', userInfo.sessionId)
}
```

#### 2. 恢复登录状态函数

```typescript
// 修复后
const checkLoginStatus = () => {
  const savedLoginStatus = localStorage.getItem('isLoggedIn')
  const savedUserInfo = localStorage.getItem('userInfo')
  
  if (savedLoginStatus === 'true' && savedUserInfo) {
    try {
      const userInfo = JSON.parse(savedUserInfo) as UserLoginInfo
      isLoggedIn.value = true
      currentUser.value = userInfo
      
      // ✅ 更新 WebSocket 配置
      wsConfig.value.openid = userInfo.openid
      wsConfig.value.aiSessionId = userInfo.sessionId  // 新增：恢复正确的 sessionId
      
      console.log('恢复登录状态 - openid:', userInfo.openid, 'sessionId:', userInfo.sessionId)
    } catch (error) {
      console.error('解析本地登录信息失败:', error)
      handleLogout()
    }
  }
}
```

#### 3. 用户名密码登录处理函数

```typescript
// 已正确实现（无需修改）
const handleUserAuthLoginSuccess = (userInfo: UserInfo) => {
  const loginInfo: UserLoginInfo = {
    openid: userInfo.userId,
    nickname: userInfo.nickname || userInfo.username,
    avatar: userInfo.avatar || '',
    sessionId: userInfo.aiSessionId || generateSessionId()  // ✅ 正确映射
  }
  
  // ✅ 正确传递到 WebSocket 配置
  wsConfig.value.openid = loginInfo.openid
  wsConfig.value.aiSessionId = loginInfo.sessionId
}
```

## WebSocket 组件 ID 使用

### ChatWindow 组件

接收并使用 ID 参数：

```typescript
const props = withDefaults(defineProps<{
  wsUrl: string
  openid?: string
  aiSessionId?: string  // 用于标识会话
  mode?: 'text' | 'voice'
  visible?: boolean
}>(), {
  mode: 'text',
  visible: true
})

// 构建 WebSocket 配置
const config: WebSocketConfig = {
  baseUrl: props.wsUrl,
  openid: props.openid,
  aiSessionId: props.aiSessionId,  // 传递给 WebSocket 服务
  mode: props.mode
}
```

### VoiceCall 组件

接收并使用 ID 参数：

```typescript
interface Props {
  visible: boolean
  wsUrl: string
  openid?: string
  aiSessionId?: string  // 用于标识会话
}

// 初始化语音通话管理器
voiceCallManager.value = new VoiceCallManager({
  wsBaseUrl: props.wsUrl,
  openid: props.openid,
  aiSessionId: props.aiSessionId  // 传递给语音通话服务
})
```

## 数据流向图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户登录                               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐          ┌──────▼──────┐
        │   扫码登录      │          │  密码登录    │
        │ QRCodeLogin    │          │ UserAuthModal│
        └───────┬────────┘          └──────┬──────┘
                │                           │
                │ UserLoginInfo             │ UserInfo
                │ {                         │ {
                │   openid                  │   userId → openid
                │   sessionId               │   aiSessionId → sessionId
                │ }                         │ }
                │                           │
                └─────────────┬─────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    App.vue         │
                    │  统一处理为        │
                    │  UserLoginInfo     │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   wsConfig         │
                    │   {                │
                    │     openid         │
                    │     aiSessionId    │
                    │   }                │
                    └─────────┬──────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐          ┌──────▼──────┐
        │  ChatWindow    │          │  VoiceCall  │
        │  :openid       │          │  :openid    │
        │  :ai-session-id│          │  :ai-session-id│
        └───────┬────────┘          └──────┬──────┘
                │                           │
                │                           │
        ┌───────▼────────┐          ┌──────▼──────────┐
        │ WebSocketService│         │ VoiceCallManager│
        │ 建立连接并传递ID │         │  建立连接并传递ID │
        └────────────────┘          └─────────────────┘
```

## 验证要点

### 测试场景

1. **扫码登录测试**：
   - 打开扫码登录窗口
   - 扫码登录成功
   - 检查控制台日志，确认 `openid` 和 `sessionId` 都已正确设置
   - 打开聊天窗口或语音通话，验证功能正常

2. **用户名密码登录测试**：
   - 打开登录窗口
   - 输入用户名密码登录
   - 检查控制台日志，确认 `openid` 和 `sessionId` 都已正确设置
   - 打开聊天窗口或语音通话，验证功能正常

3. **恢复登录状态测试**：
   - 登录后刷新页面
   - 检查控制台日志，确认登录状态和 ID 都已恢复
   - 打开聊天窗口或语音通话，验证功能正常

### 控制台日志示例

**扫码登录成功**：
```
扫码登录成功: { openid: "wx_xxx", sessionId: "session_xxx", ... }
扫码登录状态已更新 - openid: wx_xxx sessionId: session_xxx
```

**用户名密码登录成功**：
```
用户名密码登录成功: { userId: "user_xxx", aiSessionId: "session_xxx", ... }
登录状态已更新，sessionId: session_xxx
```

**恢复登录状态**：
```
恢复登录状态 - openid: wx_xxx sessionId: session_xxx
```

## 关键改进

1. **统一 ID 传递逻辑**：所有登录方式都正确传递 `openid` 和 `aiSessionId`
2. **增强调试能力**：添加详细的控制台日志，方便排查问题
3. **确保数据一致性**：登录、恢复、WebSocket 连接全程保持 ID 的正确传递

## 后续建议

1. **类型系统优化**：考虑统一 `UserLoginInfo` 和 `UserInfo` 的字段命名
2. **错误处理**：添加 ID 缺失时的友好提示
3. **文档完善**：在相关服务文档中说明 ID 字段的用途和要求

## 相关文件

- `src/App.vue` - 主应用组件，处理登录逻辑和 WebSocket 配置
- `src/components/ChatWindow.vue` - 聊天窗口组件，接收并使用 ID 参数
- `src/components/VoiceCall.vue` - 语音通话组件，接收并使用 ID 参数
- `src/types/login.ts` - 定义登录相关的 TypeScript 类型
- `src/services/websocket.ts` - WebSocket 服务实现
- `src/services/voiceCallManager.ts` - 语音通话管理器实现

## 更新日期

2026年1月17日
