# Live2D 前端接口文档

> 本文档整理了前端项目所需的所有后端接口，供 Python 后端对接参考。
>
> - 基础地址（开发）：`http://localhost:8080`
> - 基础地址（生产）：`https://shiwu.shop`
> - WebSocket（开发）：`ws://localhost:8080`
> - WebSocket（生产）：`wss://shiwu.shop`

---

## 目录

- [一、通用规范](#一通用规范)
  - [通用响应格式](#通用响应格式)
  - [认证方式](#认证方式)
- [二、用户认证模块](#二用户认证模块)
  - [2.1 用户注册](#21-用户注册)
  - [2.2 用户登录](#22-用户登录)
  - [2.3 修改密码](#23-修改密码)
  - [2.4 发送注册邮箱验证码](#24-发送注册邮箱验证码)
  - [2.5 发送找回密码邮箱验证码](#25-发送找回密码邮箱验证码)
  - [2.6 通过邮箱验证码重置密码](#26-通过邮箱验证码重置密码)
- [三、AI 模型配置模块](#三ai-模型配置模块)
  - [3.1 获取所有可用模型列表](#31-获取所有可用模型列表)
  - [3.2 获取指定厂商的模型列表](#32-获取指定厂商的模型列表)
  - [3.3 获取所有厂商列表](#33-获取所有厂商列表)
  - [3.4 获取默认推荐模型](#34-获取默认推荐模型)
  - [3.5 获取支持流式的模型](#35-获取支持流式的模型)
  - [3.6 获取前端展示模型列表](#36-获取前端展示模型列表)
  - [3.7 检查模型是否可用](#37-检查模型是否可用)
  - [3.8 获取单个模型详情](#38-获取单个模型详情)
  - [3.9 获取协议列表](#39-获取协议列表)
- [四、AI 模型切换与运行时模块](#四ai-模型切换与运行时模块)
  - [4.1 获取协议健康状态](#41-获取协议健康状态)
  - [4.2 动态切换 AI 模型](#42-动态切换-ai-模型)
  - [4.3 获取当前 AI 模型信息](#43-获取当前-ai-模型信息)
  - [4.4 测试 AI 模型](#44-测试-ai-模型)
  - [4.5 清除指定缓存](#45-清除指定缓存)
  - [4.6 清除所有缓存](#46-清除所有缓存)
  - [4.7 设置用户模型偏好](#47-设置用户模型偏好)
  - [4.8 获取用户模型偏好](#48-获取用户模型偏好)
  - [4.9 清除用户模型偏好](#49-清除用户模型偏好)
  - [4.10 获取用户 ChatClient](#410-获取用户-chatclient)
- [五、WebSocket 接口](#五websocket-接口)
  - [5.1 聊天 WebSocket](#51-聊天-websocket)
  - [5.2 语音通话 WebSocket](#52-语音通话-websocket)
  - [5.3 扫码登录 WebSocket](#53-扫码登录-websocket)
- [六、数据结构定义](#六数据结构定义)
- [七、音频格式规范](#七音频格式规范)
- [八、Live2D 动画指令协议](#八live2d-动画指令协议)

---

## 一、通用规范

### 通用响应格式

所有 HTTP 接口统一使用以下 JSON 响应格式：

```json
{
  "code": 200,
  "msg": "响应消息",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 状态码，`200` 表示成功，`500` 表示失败 |
| msg | string | 响应消息（认证模块使用 `msg`，AI 模块使用 `message`） |
| data | T \| null | 响应数据，失败时为 `null` |

### 认证方式

**所有接口均需携带 Token**，包括认证模块的注册、登录等接口。

HTTP 接口在请求头中携带 JWT Token：

```
Authorization: <token>
```

Token 在用户登录或注册成功后由后端返回，前端存储在 `localStorage` 中。对于未登录用户（如首次注册），Token 字段可为空，但请求头中仍需包含该字段。

WebSocket 接口通过 URL 查询参数携带 Token：

```
ws://host:port/ws/chat?openid=xxx&aiSessionId=xxx&token=xxx
```

---

## 二、用户认证模块

基础路径：`/auth`

> 本模块所有接口使用 `application/x-www-form-urlencoded` 格式提交表单数据。
> **所有接口均需携带 `Authorization` 请求头**（未登录时 Token 可为空）。

### 2.1 用户注册

- **URL**: `POST /auth/register`
- **Content-Type**: `application/x-www-form-urlencoded`
- **认证**: ✅ 需要（未登录时 Token 为空）

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名 |
| password | string | ✅ | 密码（≥6位） |
| email | string | ✅ | 邮箱 |
| code | string | ✅ | 邮箱验证码 |
| phone | string | ❌ | 手机号 |

#### 请求示例

```
POST /auth/register
Content-Type: application/x-www-form-urlencoded
Authorization: <token>

username=testuser&password=123456&email=test@example.com&code=123456&phone=13800138000
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "注册成功",
  "data": {
    "userId": "1",
    "username": "testuser",
    "email": "test@example.com",
    "phone": "13800138000",
    "nickname": "testuser",
    "avatar": "",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "aiSessionId": "session_1234567890"
  }
}
```

---

### 2.2 用户登录

- **URL**: `POST /auth/login`
- **Content-Type**: `application/x-www-form-urlencoded`
- **认证**: ✅ 需要（未登录时 Token 为空）

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| loginIdentifier | string | ✅ | 登录标识（用户名/邮箱/手机号） |
| password | string | ✅ | 密码 |

#### 请求示例

```
POST /auth/login
Content-Type: application/x-www-form-urlencoded
Authorization: <token>

loginIdentifier=testuser&password=123456
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "userId": "1",
    "username": "testuser",
    "email": "test@example.com",
    "phone": "13800138000",
    "nickname": "testuser",
    "avatar": "",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "aiSessionId": "session_1234567890"
  }
}
```

---

### 2.3 修改密码

- **URL**: `POST /auth/changePassword`
- **Content-Type**: `application/x-www-form-urlencoded`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | ✅ | 旧密码 |
| newPassword | string | ✅ | 新密码（≥6位） |

#### 请求示例

```
POST /auth/changePassword
Content-Type: application/x-www-form-urlencoded
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

oldPassword=123456&newPassword=654321
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "密码修改成功",
  "data": "密码修改成功"
}
```

---

### 2.4 发送注册邮箱验证码

- **URL**: `POST /auth/sendEmailCode`
- **Content-Type**: `application/x-www-form-urlencoded`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址 |

#### 请求示例

```
POST /auth/sendEmailCode
Content-Type: application/x-www-form-urlencoded
Authorization: <token>

email=test@example.com
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "验证码已发送",
  "data": {
    "message": "验证码已发送，请查收邮件"
  }
}
```

---

### 2.5 发送找回密码邮箱验证码

- **URL**: `POST /auth/sendResetEmailCode`
- **Content-Type**: `application/x-www-form-urlencoded`
- **认证**: 不需要

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址 |

#### 请求示例

```
POST /auth/sendResetEmailCode
Content-Type: application/x-www-form-urlencoded

email=test@example.com
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "验证码已发送",
  "data": {
    "message": "验证码已发送，请查收邮件"
  }
}
```

---

### 2.6 通过邮箱验证码重置密码

- **URL**: `POST /auth/resetPasswordByEmail`
- **Content-Type**: `application/x-www-form-urlencoded`
- **认证**: 不需要

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱 |
| code | string | ✅ | 邮箱验证码 |
| newPassword | string | ✅ | 新密码（≥6位） |

#### 请求示例

```
POST /auth/resetPasswordByEmail
Content-Type: application/x-www-form-urlencoded

email=test@example.com&code=123456&newPassword=654321
```

#### 响应示例

```json
{
  "code": 200,
  "msg": "密码重置成功",
  "data": "密码重置成功"
}
```

---

## 三、AI 模型配置模块

基础路径：`/api/ai-model-config`

> 本模块所有接口使用 `application/json` 格式，需要 `Authorization` 请求头。

### 3.1 获取所有可用模型列表

- **URL**: `GET /api/ai-model-config/list`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "fullIdentifier": "openai:gpt-4",
      "protocolType": "openai",
      "protocolName": "OpenAI",
      "modelName": "GPT-4",
      "modelType": "chat",
      "description": "GPT-4 模型",
      "maxTokens": 8192,
      "supportStream": true,
      "isDefault": true,
      "priority": 1,
      "status": 1,
      "healthy": true
    }
  ]
}
```

---

### 3.2 获取指定厂商的模型列表

- **URL**: `GET /api/ai-model-config/list/{vendorCode}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| vendorCode | path | string | ✅ | 厂商编码 |

#### 请求示例

```
GET /api/ai-model-config/list/openai
Authorization: <token>
```

#### 响应示例

同 [3.1 获取所有可用模型列表](#31-获取所有可用模型列表)

---

### 3.3 获取所有厂商列表

- **URL**: `GET /api/ai-model-config/vendors`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "vendorCode": "openai",
      "vendorName": "OpenAI",
      "modelCount": 3,
      "hasDefault": true
    },
    {
      "vendorCode": "anthropic",
      "vendorName": "Anthropic",
      "modelCount": 2,
      "hasDefault": false
    }
  ]
}
```

---

### 3.4 获取默认推荐模型

- **URL**: `GET /api/ai-model-config/default`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "fullIdentifier": "openai:gpt-4",
      "protocolType": "openai",
      "protocolName": "OpenAI",
      "modelName": "GPT-4",
      "modelType": "chat",
      "description": "GPT-4 模型",
      "maxTokens": 8192,
      "supportStream": true,
      "isDefault": true,
      "priority": 1
    }
  ]
}
```

> 返回数组格式，前端取第一个元素作为默认模型。

---

### 3.5 获取支持流式的模型

- **URL**: `GET /api/ai-model-config/stream`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

同 [3.1 获取所有可用模型列表](#31-获取所有可用模型列表)，仅返回 `supportStream: true` 的模型。

---

### 3.6 获取前端展示模型列表

- **URL**: `GET /api/ai-model-config/display`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

同 [3.1 获取所有可用模型列表](#31-获取所有可用模型列表)

> 前端实际调用时会同时请求此接口和 `/api/ai/protocols`，合并健康状态信息后展示。

---

### 3.7 检查模型是否可用

- **URL**: `GET /api/ai-model-config/check/{fullIdentifier}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| fullIdentifier | path | string | ✅ | 模型完整标识（需 URL 编码） |

#### 请求示例

```
GET /api/ai-model-config/check/openai%3Agpt-4
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "fullIdentifier": "openai:gpt-4",
    "available": true
  }
}
```

---

### 3.8 获取单个模型详情

- **URL**: `GET /api/ai-model-config/detail/{fullIdentifier}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| fullIdentifier | path | string | ✅ | 模型完整标识（需 URL 编码） |

#### 请求示例

```
GET /api/ai-model-config/detail/openai%3Agpt-4
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "fullIdentifier": "openai:gpt-4",
    "protocolType": "openai",
    "protocolName": "OpenAI",
    "modelName": "GPT-4",
    "modelType": "chat",
    "description": "GPT-4 模型",
    "maxTokens": 8192,
    "supportStream": true,
    "isDefault": true,
    "priority": 1
  }
}
```

---

### 3.9 获取协议列表

- **URL**: `GET /api/ai-model-config/protocols`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "protocolType": "openai",
      "protocolName": "OpenAI",
      "modelCount": 3
    },
    {
      "protocolType": "anthropic",
      "protocolName": "Anthropic",
      "modelCount": 2
    }
  ]
}
```

---

## 四、AI 模型切换与运行时模块

基础路径：`/api/ai`

> 本模块所有接口需要 `Authorization` 请求头。

### 4.1 获取协议健康状态

- **URL**: `GET /api/ai/protocols`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 2,
    "protocols": {
      "openai": {
        "healthy": true,
        "model": "gpt-4",
        "description": "OpenAI GPT-4"
      },
      "anthropic": {
        "healthy": false,
        "model": "claude-3",
        "description": "Anthropic Claude-3"
      }
    },
    "timestamp": 1234567890
  }
}
```

> `protocols` 为对象格式，键为 `protocolType`，值为该协议的健康信息。

---

### 4.2 动态切换 AI 模型

- **URL**: `POST /api/ai/switch?model={model}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| model | query | string | ✅ | 模型标识（需 URL 编码），格式：`vendor:model` |

#### 请求示例

```
POST /api/ai/switch?model=openai%3Agpt-4
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "模型切换成功",
    "currentModel": "openai:gpt-4",
    "protocolType": "openai",
    "modelCode": "gpt-4",
    "modelName": "GPT-4",
    "timestamp": 1234567890
  }
}
```

---

### 4.3 获取当前 AI 模型信息

- **URL**: `GET /api/ai/current`
- **认证**: ✅ 需要

#### 请求参数

无

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "cachedClients": {
      "openai": { "model": "gpt-4" }
    },
    "registeredProtocols": ["openai", "anthropic"],
    "availableProtocols": ["openai"],
    "timestamp": 1234567890
  }
}
```

> 前端兼容字段：`registeredProtocols` 映射为 `registeredProviders`，`availableProtocols` 映射为 `availableVendors`。

---

### 4.4 测试 AI 模型

- **URL**: `POST /api/ai/test?model={model}&prompt={prompt}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| model | query | string | ✅ | 模型标识（需 URL 编码） |
| prompt | query | string | ❌ | 测试提示词（需 URL 编码） |

#### 请求示例

```
POST /api/ai/test?model=openai%3Agpt-4&prompt=Hello
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "model": "openai:gpt-4",
    "response": "Hello! How can I help you?",
    "executionTime": "1.23s",
    "promptLength": 5,
    "responseLength": 26,
    "timestamp": 1234567890
  }
}
```

---

### 4.5 清除指定缓存

- **URL**: `DELETE /api/ai/cache/{key}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| key | path | string | ✅ | 缓存键（需 URL 编码） |

#### 请求示例

```
DELETE /api/ai/cache/openai_client
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "缓存清除成功",
  "data": null
}
```

---

### 4.6 清除所有缓存

- **URL**: `DELETE /api/ai/cache/all`
- **认证**: ✅ 需要

#### 请求参数

无

#### 请求示例

```
DELETE /api/ai/cache/all
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "所有缓存已清除",
  "data": null
}
```

---

### 4.7 设置用户模型偏好

- **URL**: `POST /api/ai/user/preference?userId={userId}&model={model}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| userId | query | string | ✅ | 用户ID（需 URL 编码） |
| model | query | string | ✅ | 模型标识（需 URL 编码） |

#### 请求示例

```
POST /api/ai/user/preference?userId=1&model=openai%3Agpt-4
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "偏好设置成功",
    "userId": "1",
    "preferredModel": "openai:gpt-4",
    "timestamp": 1234567890
  }
}
```

---

### 4.8 获取用户模型偏好

- **URL**: `GET /api/ai/user/preference?userId={userId}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| userId | query | string | ✅ | 用户ID（需 URL 编码） |

#### 请求示例

```
GET /api/ai/user/preference?userId=1
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "1",
    "preferredModel": "openai:gpt-4",
    "hasCustomPreference": true,
    "timestamp": 1234567890
  }
}
```

---

### 4.9 清除用户模型偏好

- **URL**: `DELETE /api/ai/user/preference?userId={userId}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| userId | query | string | ✅ | 用户ID（需 URL 编码） |

#### 请求示例

```
DELETE /api/ai/user/preference?userId=1
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "偏好已清除",
    "userId": "1",
    "preferredModel": "openai:gpt-4",
    "timestamp": 1234567890
  }
}
```

---

### 4.10 获取用户 ChatClient

- **URL**: `GET /api/ai/user/client?userId={userId}`
- **认证**: ✅ 需要

#### 请求参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| userId | query | string | ✅ | 用户ID（需 URL 编码） |

#### 请求示例

```
GET /api/ai/user/client?userId=1
Authorization: <token>
```

#### 响应示例

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "1",
    "usingModel": "openai:gpt-4",
    "clientAvailable": true,
    "isCustomPreference": true,
    "timestamp": 1234567890
  }
}
```

---

## 五、WebSocket 接口

### 5.1 聊天 WebSocket

- **连接URL**: `ws://{host}:{port}/ws/chat?openid={openid}&aiSessionId={aiSessionId}`
- **协议**: 文本 JSON + 二进制（语音数据）

#### 连接参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| openid | query | string | ❌ | 用户唯一标识 |
| aiSessionId | query | string | ❌ | AI 会话ID |

#### 前端发送消息类型

##### 文本消息

```json
{
  "type": "TEXT",
  "content": "你好",
  "sender": "user",
  "timestamp": 1234567890,
  "id": "unique-id"
}
```

##### 控制消息

```json
{
  "type": "CONTROL",
  "content": "open_websocket",
  "sender": "user"
}
```

> `content` 字段为控制命令字符串，不是嵌套对象。

##### 图片消息

```json
{
  "type": "IMAGES",
  "content": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
  "sender": "user",
  "timestamp": 1234567890,
  "id": "unique-id"
}
```

##### 心跳

```json
{
  "type": "PING"
}
```

> 前端每 30 秒发送一次心跳。

##### 二进制音频数据

直接发送 `ArrayBuffer`，格式为 PCM（16kHz、16bit、单声道、小端序）。

#### 后端返回消息类型

##### AI 文本回复

```json
{
  "type": "TEXT",
  "content": "你好！有什么可以帮你的吗？",
  "sender": "ai",
  "timestamp": 1234567890,
  "id": "unique-id",
  "animation": {
    "emotion": "happy",
    "motion": { "group": "idle", "index": 0 },
    "expression": { "name": "Smile" }
  }
}
```

> `animation` 字段为可选，用于驱动前端 Live2D 模型动画。

##### 控制消息响应

```json
{
  "type": "CONTROL",
  "content": "websocket_opened",
  "sender": "system"
}
```

##### 错误消息

```json
{
  "type": "ERROR",
  "content": {
    "code": "CONNECTION_ERROR",
    "message": "连接异常"
  },
  "sender": "system"
}
```

##### 心跳响应

```json
{
  "type": "PONG"
}
```

#### 控制命令枚举

| 命令 | 方向 | 说明 |
|------|------|------|
| `open_websocket` | 前端→后端 | 开启 WebSocket 功能 |
| `close_websocket` | 前端→后端 | 关闭 WebSocket 功能 |
| `voice_call_request` | 前端→后端 | 请求语音通话 |
| `voice_call_accept` | 前端→后端 | 接受语音通话 |
| `voice_call_reject` | 前端→后端 | 拒绝语音通话 |
| `voice_call_end` | 前端→后端 | 结束语音通话 |
| `start_recording` | 前端→后端 | 开始录音 |
| `stop_recording` | 前端→后端 | 停止录音 |
| `start_recognition` | 前端→后端 | 开始语音识别 |
| `interrupt` | 双向 | 打断当前对话（ASR+LLM+TTS 全部中断） |
| `pause_tts` | 前端→后端 | 暂停 TTS 播放 |
| `websocket_opened` | 后端→前端 | WebSocket 已开启 |
| `websocket_closed` | 后端→前端 | WebSocket 已关闭 |
| `tts_paused` | 后端→前端 | TTS 已暂停 |
| `connected` | 后端→前端 | 已连接 |
| `start_recording` | 后端→前端 | 指示前端开始录音 |
| `stop_recording` | 后端→前端 | 指示前端停止录音 |

---

### 5.2 语音通话 WebSocket

- **连接URL**: `ws://{host}:{port}/ws/voice?openid={openid}&aiSessionId={aiSessionId}`
- **协议**: 文本 JSON + 二进制
- **binaryType**: `arraybuffer`

#### 连接参数

| 字段 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| openid | query | string | ❌ | 用户唯一标识 |
| aiSessionId | query | string | ❌ | AI 会话ID |

#### 协议说明

与聊天 WebSocket 协议相同，但有以下差异：

| 场景 | 格式 | 说明 |
|------|------|------|
| 前端→后端（录音） | PCM | 16kHz、16bit、单声道、小端序，直接发送 ArrayBuffer |
| 后端→前端（TTS） | MP3 | 直接发送 ArrayBuffer 二进制数据 |

#### 流式 AI 回复协议

语音模式下，AI 回复采用流式传输：

1. 后端发送多个以 `ai:` 前缀开头的文本消息，每个消息包含一段 AI 回复片段：

```json
{
  "type": "TEXT",
  "content": "ai:你好",
  "sender": "ai",
  "timestamp": 1234567890
}
```

2. 前端累积所有 `ai:` 前缀的内容

3. 后端发送 `ai_reply_complete` 标记回复完成：

```json
{
  "type": "TEXT",
  "content": "ai_reply_complete",
  "sender": "ai",
  "timestamp": 1234567890
}
```

4. 同时，后端通过二进制帧发送 MP3 格式的 TTS 音频数据

#### 语音通话流程

```
前端                              后端
  |                                 |
  |--- connect ------------------>  |
  |<-- connected -----------------  |
  |--- CONTROL: open_websocket -->  |
  |<-- CONTROL: websocket_opened -- |
  |--- PCM audio data ----------->  |  (持续发送录音)
  |<-- TEXT: ai:回复片段 ----------  |  (流式文本)
  |<-- MP3 audio data ------------  |  (TTS音频)
  |<-- TEXT: ai_reply_complete ---  |  (回复完成)
  |--- PCM audio data ----------->  |  (恢复录音)
  |                                 |
  |--- CONTROL: close_websocket --> |
  |--- disconnect --------------->  |
```

---

### 5.3 扫码登录 WebSocket

- **连接URL**: `ws://{host}:{port}/ws/qrcode-login`
- **协议**: 文本 JSON

#### 前端发送消息

##### 创建二维码

```json
{
  "type": "qr_create",
  "qrcodeId": "qr_1234567890_abc123",
  "timestamp": 1234567890
}
```

#### 后端推送消息

##### 扫码通知

```json
{
  "type": "qr_scan",
  "timestamp": 1234567890
}
```

##### 登录成功

```json
{
  "type": "login_success",
  "userInfo": {
    "openid": "o1234567890",
    "nickname": "微信用户",
    "avatar": "https://example.com/avatar.jpg",
    "sessionId": "session_1234567890",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": 1234567890
}
```

##### 取消登录

```json
{
  "type": "qr_cancel",
  "timestamp": 1234567890
}
```

##### 二维码过期

```json
{
  "type": "qr_expire",
  "timestamp": 1234567890
}
```

##### 登录失败

```json
{
  "type": "login_failed",
  "data": {
    "error": "登录失败原因"
  },
  "timestamp": 1234567890
}
```

#### 扫码登录流程

```
前端                              后端
  |                                 |
  |--- connect ------------------>  |
  |--- qr_create ---------------->  |  (创建二维码会话)
  |                                 |
  |    [用户使用微信扫码]            |
  |<-- qr_scan -------------------  |  (扫码通知)
  |                                 |
  |    [用户在手机确认登录]          |
  |<-- login_success ------------  |  (登录成功，返回用户信息)
  |                                 |
  |    或                           |
  |<-- qr_cancel -----------------  |  (用户取消)
  |<-- qr_expire -----------------  |  (二维码过期，5分钟)
  |<-- login_failed --------------  |  (登录失败)
```

---

## 六、数据结构定义

### UserInfo（用户信息）

```typescript
interface UserInfo {
  userId: string       // 用户ID
  username: string     // 用户名
  email?: string       // 邮箱
  phone?: string       // 手机号
  nickname?: string    // 昵称
  avatar?: string      // 头像URL
  token: string        // JWT Token
  aiSessionId: string  // AI会话ID
}
```

### UserLoginInfo（扫码登录用户信息）

```typescript
interface UserLoginInfo {
  openid: string       // 用户唯一标识
  nickname?: string    // 用户昵称
  avatar?: string      // 用户头像URL
  sessionId: string    // 会话ID
  token?: string       // 登录Token（可选）
}
```

### ModelConfig（模型配置信息）

```typescript
interface ModelConfig {
  fullIdentifier: string  // 模型唯一标识，格式 "vendor:model"
  protocolType: string    // 协议类型
  protocolName: string    // 协议/厂商名称
  modelName: string       // 模型名称
  modelType: string       // 模型类型
  description: string     // 描述
  maxTokens?: number      // 最大token数（可选）
  supportStream: boolean  // 是否支持流式
  isDefault: boolean      // 是否为默认推荐
  priority: number        // 优先级（越小越优先）
  status?: number         // 状态（0=禁用，可选）
  healthy?: boolean       // 健康状态（可选）
}
```

### Live2DAnimationCommand（Live2D 动画指令）

```typescript
interface Live2DAnimationCommand {
  emotion?: Live2DEmotion          // 情绪
  motion?: Live2DMotionCommand     // 动作
  expression?: Live2DExpressionCommand  // 表情
}

type Live2DEmotion =
  | 'neutral'    // 中性
  | 'happy'      // 开心
  | 'angry'      // 生气
  | 'sad'        // 悲伤
  | 'surprised'  // 惊讶
  | 'shy'        // 害羞
  | 'thinking'   // 思考
  | 'greeting'   // 问候
  | 'waving'     // 挥手

interface Live2DMotionCommand {
  group: string    // 动作组名
  index?: number   // 动作索引
}

interface Live2DExpressionCommand {
  name: string     // 表情名称
}
```

### WebSocket 消息类型

```typescript
type MessageType = 'TEXT' | 'AUDIO' | 'CONTROL' | 'ERROR' | 'PING' | 'PONG' | 'IMAGES'

type ControlCommand =
  | 'open_websocket'
  | 'close_websocket'
  | 'voice_call_request'
  | 'voice_call_accept'
  | 'voice_call_reject'
  | 'voice_call_end'
  | 'start_recording'
  | 'stop_recording'
  | 'start_recognition'
  | 'interrupt'
  | 'pause_tts'

interface BaseMessage {
  type: MessageType
  content: any
  sender?: 'user' | 'system' | 'ai'
  timestamp?: number
  id?: string
  animation?: Live2DAnimationCommand
}
```

### 扫码登录消息类型

```typescript
type WSMessageType =
  | 'qr_create'       // 创建二维码
  | 'qr_scan'         // 扫码通知
  | 'qr_confirm'      // 确认登录
  | 'qr_cancel'       // 取消登录
  | 'qr_expire'       // 二维码过期
  | 'login_success'   // 登录成功
  | 'login_failed'    // 登录失败

type QRCodeLoginStatus =
  | 'pending'    // 等待扫码
  | 'scanned'    // 已扫码
  | 'confirmed'  // 已确认
  | 'expired'    // 已过期
  | 'canceled'   // 已取消
```

---

## 七、音频格式规范

| 场景 | 格式 | 采样率 | 位深 | 声道数 | 字节序 |
|------|------|--------|------|--------|--------|
| 前端→后端（录音输入） | PCM | 16kHz | 16bit | 1（单声道） | 小端序（Little Endian） |
| 后端→前端（TTS 输出） | MP3 | - | - | - | - |

### PCM 数据说明

- 采样率：16000 Hz
- 采样位数：16 bit（Int16）
- 声道数：1（单声道）
- 字节序：小端序（Little Endian）
- 数据范围：[-32768, 32767]
- 前端通过 `ScriptProcessorNode` 将 `Float32Array`（[-1, 1]）转换为 `Int16Array` 后发送

---

## 八、Live2D 动画指令协议

后端在 AI 回复消息中可通过 `animation` 字段驱动前端 Live2D 模型动画。

### 指令结构

```json
{
  "emotion": "happy",
  "motion": {
    "group": "idle",
    "index": 0
  },
  "expression": {
    "name": "Smile"
  }
}
```

### 支持的情绪类型

| 情绪 | 值 | 说明 |
|------|------|------|
| 中性 | `neutral` | 默认状态 |
| 开心 | `happy` | 高兴/愉快 |
| 生气 | `angry` | 愤怒 |
| 悲伤 | `sad` | 难过 |
| 惊讶 | `surprised` | 惊奇 |
| 害羞 | `shy` | 腼腆 |
| 思考 | `thinking` | 思考中 |
| 问候 | `greeting` | 打招呼 |
| 挥手 | `waving` | 挥手告别 |

### 使用方式

1. 后端在 AI 文本回复中附带 `animation` 字段
2. 前端解析 `animation` 字段并执行对应的 Live2D 动画
3. 三个子字段 `emotion`、`motion`、`expression` 均为可选，可单独使用或组合使用
