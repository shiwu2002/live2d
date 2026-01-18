# 微信小程序扫码登录功能使用指南

## 功能概述

本项目实现了完整的微信小程序扫码登录功能，用户可以通过微信小程序扫描Web端生成的二维码完成登录，获取用户的openid、昵称、头像等信息。

### 主要特性

- ✅ 实时二维码生成
- ✅ WebSocket实时通信
- ✅ 扫码状态即时反馈
- ✅ 二维码过期自动刷新（5分钟有效期）
- ✅ 倒计时显示
- ✅ 登录状态持久化
- ✅ 自动重连机制
- ✅ 优雅的UI设计
- ✅ 完整的错误处理

## 技术架构

### 前端技术栈

- **Vue 3 Composition API**: 响应式状态管理
- **TypeScript**: 类型安全
- **QRCode.js**: 二维码生成
- **WebSocket**: 实时通信
- **localStorage**: 状态持久化

### 核心文件结构

```
src/
├── types/
│   └── login.ts              # 登录相关类型定义
├── services/
│   └── qrcodeLogin.ts        # 二维码登录服务类
├── components/
│   └── QRCodeLogin.vue       # 登录UI组件
└── App.vue                   # 主应用（集成登录功能）
```

### 数据流程

```
1. 用户点击登录按钮
   ↓
2. Web端生成二维码（包含qrcodeId和过期时间）
   ↓
3. 建立WebSocket连接监听扫码状态
   ↓
4. 小程序扫描二维码
   ↓
5. 小程序调用后端接口传递qrcodeId和用户信息
   ↓
6. 后端通过WebSocket推送登录成功消息
   ↓
7. Web端接收用户信息并完成登录
```

## 使用方法

### 1. 用户操作流程

1. 打开Web应用
2. 点击右下角的 🔐 登录按钮
3. 弹出二维码登录窗口
4. 使用微信小程序扫描二维码
5. 在小程序中确认登录
6. Web端自动完成登录并显示用户信息

### 2. 退出登录

1. 登录后，右下角按钮变为 👤 图标
2. 点击按钮即可退出登录
3. 或点击右上角用户信息面板中的"退出登录"按钮

### 3. 登录状态查看

登录成功后，在页面右上角会显示用户信息面板：
- 用户头像
- 用户昵称
- 用户OpenID

## 服务端接口要求

### WebSocket服务端点

**地址**: `ws://your-domain/ws/qrcode-login`

### 消息格式

所有消息使用JSON格式，包含`type`和`data`字段：

```typescript
{
  type: string;  // 消息类型
  data: any;     // 消息数据
}
```

### 需要实现的消息类型

#### 1. 连接建立（服务端 → 客户端）

```json
{
  "type": "connected",
  "data": {
    "message": "WebSocket连接成功"
  }
}
```

#### 2. 二维码注册（客户端 → 服务端）

Web端生成二维码后需要向服务端注册：

```json
{
  "type": "register",
  "data": {
    "qrcodeId": "uuid-string",
    "expireTime": 1705456789000
  }
}
```

#### 3. 小程序扫码通知（服务端 → 客户端）

当小程序扫描二维码后：

```json
{
  "type": "scanned",
  "data": {
    "qrcodeId": "uuid-string",
    "timestamp": 1705456789000
  }
}
```

#### 4. 登录成功通知（服务端 → 客户端）

当用户在小程序确认登录后：

```json
{
  "type": "login_success",
  "data": {
    "qrcodeId": "uuid-string",
    "userInfo": {
      "openid": "user-openid",
      "nickname": "用户昵称",
      "avatar": "https://example.com/avatar.jpg",
      "sessionId": "session-token"
    }
  }
}
```

#### 5. 登录失败通知（服务端 → 客户端）

```json
{
  "type": "login_failed",
  "data": {
    "qrcodeId": "uuid-string",
    "error": "登录失败原因"
  }
}
```

#### 6. 二维码过期通知（服务端 → 客户端）

```json
{
  "type": "qrcode_expired",
  "data": {
    "qrcodeId": "uuid-string"
  }
}
```

### HTTP接口（小程序端调用）

#### 扫码接口

**端点**: `POST /api/qrcode/scan`

**请求参数**:
```json
{
  "qrcodeId": "uuid-string",
  "openid": "user-openid"
}
```

**响应**:
```json
{
  "success": true,
  "message": "扫码成功"
}
```

#### 确认登录接口

**端点**: `POST /api/qrcode/confirm`

**请求参数**:
```json
{
  "qrcodeId": "uuid-string",
  "openid": "user-openid",
  "nickname": "用户昵称",
  "avatar": "https://example.com/avatar.jpg"
}
```

**响应**:
```json
{
  "success": true,
  "sessionId": "session-token",
  "message": "登录成功"
}
```

## 小程序端实现建议

### 1. 扫码功能

```javascript
// 扫描二维码
wx.scanCode({
  success: (res) => {
    const qrcodeData = res.result; // 格式: "wxlogin|qrcodeId|expireTime"
    const [prefix, qrcodeId, expireTime] = qrcodeData.split('|');
    
    if (prefix !== 'wxlogin') {
      wx.showToast({ title: '无效的二维码', icon: 'none' });
      return;
    }
    
    // 检查是否过期
    if (Date.now() > parseInt(expireTime)) {
      wx.showToast({ title: '二维码已过期', icon: 'none' });
      return;
    }
    
    // 调用扫码接口
    this.handleScan(qrcodeId);
  }
});
```

### 2. 扫码接口调用

```javascript
handleScan(qrcodeId) {
  wx.request({
    url: 'https://your-domain/api/qrcode/scan',
    method: 'POST',
    data: {
      qrcodeId: qrcodeId,
      openid: this.data.userInfo.openid
    },
    success: (res) => {
      if (res.data.success) {
        // 显示确认登录页面
        this.showConfirmPage(qrcodeId);
      }
    }
  });
}
```

### 3. 确认登录

```javascript
confirmLogin(qrcodeId) {
  wx.request({
    url: 'https://your-domain/api/qrcode/confirm',
    method: 'POST',
    data: {
      qrcodeId: qrcodeId,
      openid: this.data.userInfo.openid,
      nickname: this.data.userInfo.nickname,
      avatar: this.data.userInfo.avatarUrl
    },
    success: (res) => {
      if (res.data.success) {
        wx.showToast({ title: '登录成功', icon: 'success' });
        // 返回上一页或首页
        wx.navigateBack();
      }
    }
  });
}
```

## 配置说明

### 修改WebSocket地址

在 `src/App.vue` 中修改WebSocket地址：

```vue
<QRCodeLogin
  :visible="showQRCodeLogin"
  ws-url="ws://your-domain/ws/qrcode-login"
  @close="showQRCodeLogin = false"
  @login-success="handleLoginSuccess"
  @login-failed="handleLoginFailed"
/>
```

### 修改二维码过期时间

在 `src/services/qrcodeLogin.ts` 中修改：

```typescript
private readonly EXPIRE_TIME = 5 * 60 * 1000; // 修改为所需的毫秒数
```

### 修改二维码尺寸

在 `src/services/qrcodeLogin.ts` 中修改：

```typescript
private readonly QR_SIZE = 280; // 修改为所需的像素值
```

### 修改重连配置

在 `src/services/qrcodeLogin.ts` 中修改：

```typescript
private readonly MAX_RECONNECT_ATTEMPTS = 5;    // 最大重连次数
private readonly RECONNECT_DELAY = 1000;        // 初始重连延迟（毫秒）
private readonly MAX_RECONNECT_DELAY = 30000;   // 最大重连延迟（毫秒）
```

## 状态说明

### 二维码状态

| 状态 | 说明 | UI表现 |
|------|------|--------|
| pending | 等待扫码 | 显示二维码 + 倒计时 |
| scanned | 已扫码，等待确认 | 绿色遮罩 + "已扫码，请在小程序确认登录" |
| confirmed | 登录成功 | 自动关闭窗口，显示用户信息 |
| expired | 二维码过期 | 灰色遮罩 + 刷新按钮 |
| canceled | 用户取消登录 | 显示错误提示 |

### WebSocket连接状态

- **CONNECTING**: 正在连接
- **OPEN**: 已连接
- **CLOSING**: 正在关闭
- **CLOSED**: 已关闭

## 安全建议

1. **HTTPS/WSS**: 生产环境必须使用HTTPS和WSS协议
2. **sessionId验证**: 服务端应为每次登录生成唯一的sessionId
3. **二维码唯一性**: 每个二维码ID应该是唯一且不可预测的（使用UUID）
4. **过期时间**: 建议设置合理的过期时间（3-5分钟）
5. **频率限制**: 对扫码和确认接口进行频率限制
6. **IP白名单**: 根据需要配置IP白名单
7. **数据加密**: 敏感信息传输应加密

## 常见问题

### Q1: 二维码生成失败？

**A**: 检查qrcode依赖是否正确安装：
```bash
npm install qrcode
```

### Q2: WebSocket连接失败？

**A**: 
1. 检查WebSocket服务是否启动
2. 检查URL是否正确（ws://或wss://）
3. 检查防火墙和代理设置
4. 查看浏览器控制台错误信息

### Q3: 扫码后没有反应？

**A**:
1. 检查小程序是否正确调用了扫码接口
2. 检查服务端是否正确推送了WebSocket消息
3. 检查二维码数据格式是否正确

### Q4: 登录状态丢失？

**A**: 
1. 检查localStorage是否被清除
2. 检查sessionId是否过期
3. 考虑实现token刷新机制

### Q5: 二维码显示模糊？

**A**: 调整QR_SIZE参数，建议使用280-320之间的值

## 开发调试

### 启动开发服务器

```bash
npm run dev
```

### 查看WebSocket消息

在浏览器控制台中可以看到所有WebSocket消息的日志：

```
[QRCodeLogin] WebSocket已连接
[QRCodeLogin] 已发送注册消息: {...}
[QRCodeLogin] 收到消息: {...}
```

### 测试二维码

如果没有小程序，可以手动触发WebSocket消息进行测试：

```javascript
// 在浏览器控制台执行
const ws = new WebSocket('ws://localhost:8080/ws/qrcode-login');
ws.onopen = () => {
  // 模拟扫码
  ws.send(JSON.stringify({
    type: 'scanned',
    data: { qrcodeId: 'your-qrcode-id' }
  }));
  
  // 模拟登录成功
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'login_success',
      data: {
        qrcodeId: 'your-qrcode-id',
        userInfo: {
          openid: 'test-openid',
          nickname: '测试用户',
          avatar: 'https://example.com/avatar.jpg',
          sessionId: 'test-session'
        }
      }
    }));
  }, 2000);
};
```

## 性能优化建议

1. **二维码缓存**: 短时间内不重复生成相同二维码
2. **WebSocket心跳**: 实现心跳机制保持连接活跃
3. **懒加载**: QRCodeLogin组件使用v-if而非v-show
4. **防抖**: 刷新按钮添加防抖处理
5. **内存管理**: 组件卸载时清理定时器和WebSocket连接

## 扩展功能建议

1. **多设备登录管理**: 支持查看和管理已登录设备
2. **扫码历史**: 记录扫码登录历史
3. **账号绑定**: 支持多个小程序账号绑定
4. **权限控制**: 基于角色的访问控制
5. **登录通知**: 新设备登录时发送通知
6. **二维码美化**: 添加logo和自定义样式

## 技术支持

如有问题或建议，请通过以下方式联系：

- 提交Issue: [项目GitHub地址]
- 邮件: [支持邮箱]
- 文档: [在线文档地址]

## 更新日志

### v1.0.0 (2026-01-17)
- ✅ 初始版本发布
- ✅ 实现基本扫码登录功能
- ✅ 支持WebSocket实时通信
- ✅ 添加二维码过期机制
- ✅ 实现自动重连功能
- ✅ 完善UI交互体验
