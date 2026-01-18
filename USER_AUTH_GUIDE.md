# 用户登录注册功能使用指南

本文档介绍如何使用项目中的用户名密码登录注册功能。

## 功能概述

项目提供了完整的用户认证系统，包括：
- ✅ 用户注册（用户名、密码、邮箱、手机号）
- ✅ 用户登录（支持用户名/邮箱/手机号登录）
- ✅ 修改密码
- ✅ 实时表单验证
- ✅ 用户名/邮箱/手机号可用性检查
- ✅ Token持久化存储
- ✅ 自动登录状态恢复

## 快速开始

### 1. 打开登录窗口

点击页面右侧控制面板中的 🔐 按钮，即可打开登录注册窗口。

### 2. 用户注册

首次使用需要注册账号：

1. 在登录窗口中点击"注册账号"切换到注册模式
2. 填写注册信息：
   - **用户名**（必填）：3-20个字符，仅支持字母、数字、下划线
   - **密码**（必填）：至少6个字符
   - **确认密码**（必填）：需与密码一致
   - **邮箱**（选填）：有效的邮箱地址
   - **手机号**（选填）：11位手机号码
3. 系统会实时检查用户名、邮箱、手机号是否已被占用
4. 点击"注册"按钮完成注册
5. 注册成功后会自动登录

### 3. 用户登录

已有账号的用户可直接登录：

1. 在登录窗口保持"登录"模式
2. 填写登录信息：
   - **账号**：可以是用户名、邮箱或手机号
   - **密码**：账号对应的密码
3. 点击"登录"按钮完成登录

### 4. 退出登录

点击页面右侧控制面板中的 👤 按钮，即可退出当前登录状态。

## 技术实现

### 核心文件

1. **src/types/login.ts** - 类型定义
   - 定义了所有认证相关的TypeScript接口
   - 包括注册、登录、修改密码等请求/响应类型

2. **src/services/authService.ts** - 认证服务
   - 封装了所有API调用
   - 提供了Token管理、本地存储等功能
   - 单例模式，全局可用

3. **src/components/UserAuthModal.vue** - UI组件
   - 提供登录注册界面
   - 实现表单验证逻辑
   - 处理用户交互

4. **src/App.vue** - 主应用集成
   - 集成登录注册功能
   - 管理登录状态
   - 处理登录成功/失败事件

### API接口

认证服务默认连接到 `http://localhost:8080`，提供以下接口：

#### 1. 用户注册
```
POST /api/auth/register
Content-Type: application/x-www-form-urlencoded

参数：
- username: 用户名（必填）
- password: 密码（必填）
- email: 邮箱（选填）
- phone: 手机号（选填）

响应：
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "userId": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "phone": "手机号",
    "nickname": "昵称",
    "avatar": "头像URL",
    "token": "JWT Token",
    "aiSessionId": "AI会话ID"
  }
}
```

#### 2. 用户登录
```
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

参数：
- account: 账号（用户名/邮箱/手机号，必填）
- password: 密码（必填）

响应：同注册接口
```

#### 3. 修改密码
```
POST /api/auth/change-password
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {token}

参数：
- oldPassword: 旧密码（必填）
- newPassword: 新密码（必填）

响应：
{
  "code": 200,
  "message": "密码修改成功"
}
```

#### 4. 检查用户名可用性
```
GET /api/auth/check-username?username={username}

响应：
{
  "code": 200,
  "message": "用户名可用",
  "data": {
    "available": true
  }
}
```

#### 5. 检查邮箱可用性
```
GET /api/auth/check-email?email={email}

响应：
{
  "code": 200,
  "message": "邮箱可用",
  "data": {
    "available": true
  }
}
```

#### 6. 检查手机号可用性
```
GET /api/auth/check-phone?phone={phone}

响应：
{
  "code": 200,
  "message": "手机号可用",
  "data": {
    "available": true
  }
}
```

### 配置API地址

如需修改API基础地址，可在创建`UserAuthModal`组件时传入`apiBaseUrl` prop：

```vue
<UserAuthModal
  :visible="showUserAuthModal"
  :api-base-url="'https://your-api-server.com'"
  @close="showUserAuthModal = false"
  @login-success="handleUserAuthLoginSuccess"
  @register-success="handleUserAuthRegisterSuccess"
/>
```

或者直接修改`src/services/authService.ts`中的默认值：

```typescript
class AuthService {
  private baseUrl: string = 'https://your-api-server.com'
  // ...
}
```

## 表单验证规则

### 用户名验证
- ✅ 必填
- ✅ 3-20个字符
- ✅ 仅支持字母、数字、下划线
- ✅ 实时检查是否已被占用

### 密码验证
- ✅ 必填
- ✅ 至少6个字符
- ✅ 注册时需要确认密码一致

### 邮箱验证（选填）
- ✅ 符合邮箱格式
- ✅ 实时检查是否已被占用

### 手机号验证（选填）
- ✅ 11位数字
- ✅ 实时检查是否已被占用

## 本地存储

登录成功后，系统会在浏览器本地存储以下信息：

1. **userInfo** - 用户信息对象
   ```json
   {
     "openid": "用户ID",
     "nickname": "昵称",
     "avatar": "头像URL",
     "sessionId": "会话ID"
   }
   ```

2. **isLoggedIn** - 登录状态标识（'true'/'false'）

3. **authToken** - JWT认证令牌

刷新页面后，系统会自动从本地存储恢复登录状态。

## 使用authService

在代码中可以直接使用导出的`authService`实例：

```typescript
import { authService } from '@/services/authService'

// 检查登录状态
if (authService.isLoggedIn()) {
  const token = authService.getToken()
  const userInfo = authService.getUserInfo()
  console.log('当前用户:', userInfo)
}

// 退出登录
authService.logout()

// 检查用户名可用性
const result = await authService.checkUsername('testuser')
if (result.data.available) {
  console.log('用户名可用')
}
```

## 与其他功能集成

### 与扫码登录共存

项目同时支持用户名密码登录和微信扫码登录：
- 🔐 按钮：打开用户名密码登录窗口
- 📱 按钮：打开微信扫码登录窗口

两种登录方式共享同一个登录状态，任一方式登录成功后，另一个登录按钮会隐藏，显示为 👤 退出登录按钮。

### 与聊天功能集成

登录成功后，用户的`userId`会作为`openid`传递给WebSocket配置，用于标识用户身份：

```typescript
// 登录成功后自动更新WebSocket配置
wsConfig.value.openid = loginInfo.openid
wsConfig.value.aiSessionId = loginInfo.sessionId
```

## 错误处理

系统提供了友好的错误提示：

1. **网络错误** - "网络请求失败，请检查网络连接"
2. **验证错误** - 实时显示在对应表单字段下方
3. **API错误** - 显示服务器返回的错误信息
4. **登录失败** - "登录失败: {错误原因}"

## 安全建议

1. **密码强度**：建议用户使用复杂密码（字母+数字+特殊字符）
2. **HTTPS**：生产环境务必使用HTTPS协议
3. **Token过期**：后端应实现Token过期机制
4. **敏感操作**：修改密码等操作需验证旧密码
5. **防暴力破解**：建议后端实现登录频率限制

## 常见问题

### Q1: 如何修改密码？
A: 当前版本暂未在UI中提供修改密码功能，但`authService`已提供`changePassword()`方法，可以在需要时集成到界面中。

### Q2: 忘记密码怎么办？
A: 当前版本暂未实现找回密码功能，建议后续版本通过邮箱或手机号找回。

### Q3: 可以绑定多个邮箱或手机号吗？
A: 当前版本一个账号只支持一个邮箱和一个手机号。

### Q4: Token什么时候过期？
A: Token过期时间由后端配置，前端不做限制。建议后端设置合理的过期时间（如7天）。

### Q5: 如何实现"记住我"功能？
A: 当前已实现自动记住登录状态，刷新页面不会丢失。如需手动退出，点击退出按钮即可。

## 后续优化建议

1. **找回密码** - 通过邮箱或手机号找回密码
2. **修改个人信息** - 支持修改昵称、头像等
3. **第三方登录** - 集成微信、QQ等第三方登录
4. **双因素认证** - 增强账号安全性
5. **登录历史** - 记录登录时间、IP等信息
6. **账号冻结** - 多次登录失败自动冻结账号

## 技术支持

如有问题，请查看：
- [API文档](./USER_AUTH_API.md) - 详细的API接口说明
- [扫码登录指南](./QRCODE_LOGIN_GUIDE.md) - 微信扫码登录功能说明

---

最后更新：2026年1月17日
