# 用户认证API文档

## 概述

本文档描述了用户注册、登录、密码管理等认证相关的API接口。

**基础URL**: `/auth`

**认证方式**: JWT Token（部分接口需要）

---

## 1. 用户注册

### 接口信息
- **URL**: `/auth/register`
- **方法**: `POST`
- **认证**: 不需要
- **描述**: 注册新用户账号

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| username | String | 是 | 用户名（用于登录） | zhangsan |
| password | String | 是 | 密码（至少6位） | password123 |
| email | String | 否* | 邮箱地址 | user@example.com |
| phone | String | 否* | 手机号 | 13800138000 |

> *注意：邮箱和手机号至少需要提供一个

### 请求示例

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=zhangsan" \
  -d "password=password123" \
  -d "email=zhangsan@example.com" \
  -d "phone=13800138000"
```

### 响应参数

**成功响应 (200)**

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "aiSessionId": "660e8400-e29b-41d4-a716-446655440111"
  }
}
```

**错误响应示例**

```json
{
  "code": 400,
  "msg": "注册失败：用户名 'zhangsan' 已被使用，请更换其他用户名",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "注册失败：邮箱 'test@example.com' 已被注册，请使用其他邮箱",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "注册失败：手机号 '13800138000' 已被注册，请使用其他手机号",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "注册失败：密码长度至少为6位，请设置更强的密码",
  "data": null
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（用户名/邮箱/手机号已存在，密码不符合要求等） |
| 500 | 服务器内部错误 |

---

## 2. 用户登录

### 接口信息
- **URL**: `/auth/login`
- **方法**: `POST`
- **认证**: 不需要
- **描述**: 用户登录，支持用户名/邮箱/手机号三种方式

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| loginIdentifier | String | 是 | 登录标识（用户名/邮箱/手机号） | zhangsan |
| password | String | 是 | 密码 | password123 |

### 请求示例

**使用用户名登录**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "loginIdentifier=zhangsan" \
  -d "password=password123"
```

**使用邮箱登录**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "loginIdentifier=zhangsan@example.com" \
  -d "password=password123"
```

**使用手机号登录**
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "loginIdentifier=13800138000" \
  -d "password=password123"
```

### 响应参数

**成功响应 (200)**

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "nickname": "张三",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "aiSessionId": "660e8400-e29b-41d4-a716-446655440111"
  }
}
```

**错误响应示例**

```json
{
  "code": 400,
  "msg": "用户名/邮箱/手机号或密码错误",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "登录账号不能为空",
  "data": null
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（用户名/密码错误、参数为空等） |
| 500 | 服务器内部错误 |

---

## 3. 修改密码

### 接口信息
- **URL**: `/auth/changePassword`
- **方法**: `POST`
- **认证**: 需要（JWT Token）
- **描述**: 修改当前用户密码

### 请求头

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| Authorization | String | 是 | JWT Token | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| oldPassword | String | 是 | 旧密码 | password123 |
| newPassword | String | 是 | 新密码（至少6位） | newpassword456 |

### 请求示例

```bash
curl -X POST http://localhost:8080/auth/changePassword \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d "oldPassword=password123" \
  -d "newPassword=newpassword456"
```

### 响应参数

**成功响应 (200)**

```json
{
  "code": 200,
  "msg": "成功",
  "data": "密码修改成功"
}
```

**错误响应示例**

```json
{
  "code": 401,
  "msg": "无效的token",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "旧密码错误",
  "data": null
}
```

```json
{
  "code": 400,
  "msg": "新密码长度至少为6位",
  "data": null
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误（旧密码错误、新密码不符合要求等） |
| 401 | 未授权（Token无效或过期） |
| 500 | 服务器内部错误 |

---

## 4. 检查用户名是否可用

### 接口信息
- **URL**: `/auth/checkUsername`
- **方法**: `GET`
- **认证**: 不需要
- **描述**: 检查用户名是否已被使用

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| username | String | 是 | 用户名 | zhangsan |

### 请求示例

```bash
curl -X GET "http://localhost:8080/auth/checkUsername?username=zhangsan"
```

### 响应参数

**成功响应 (200)**

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "available": false
  }
}
```

> `available`: `true` 表示可用，`false` 表示已被使用

---

## 5. 检查邮箱是否可用

### 接口信息
- **URL**: `/auth/checkEmail`
- **方法**: `GET`
- **认证**: 不需要
- **描述**: 检查邮箱是否已被注册

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| email | String | 是 | 邮箱地址 | test@example.com |

### 请求示例

```bash
curl -X GET "http://localhost:8080/auth/checkEmail?email=test@example.com"
```

### 响应参数

**成功响应 (200)**

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "available": true
  }
}
```

> `available`: `true` 表示可用，`false` 表示已被注册

---

## 6. 检查手机号是否可用

### 接口信息
- **URL**: `/auth/checkPhone`
- **方法**: `GET`
- **认证**: 不需要
- **描述**: 检查手机号是否已被注册

### 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|--------|------|------|------|------|
| phone | String | 是 | 手机号 | 13800138000 |

### 请求示例

```bash
curl -X GET "http://localhost:8080/auth/checkPhone?phone=13800138000"
```

### 响应参数

**成功响应 (200)**

```json
{
  "code": 200,
  "msg": "成功",
  "data": {
    "available": false
  }
}
```

> `available`: `true` 表示可用，`false` 表示已被注册

---

## 通用说明

### Token使用

登录或注册成功后会返回JWT Token，需要在后续需要认证的接口中携带该Token：

```bash
Authorization: <token>
```

### 响应格式

所有接口均采用统一的响应格式：

```json
{
  "code": 200,
  "msg": "成功",
  "data": { }
}
```

- `code`: 状态码（200表示成功，400表示客户端错误，401表示未授权，500表示服务器错误）
- `msg`: 响应消息
- `data`: 响应数据（可能为对象、数组、字符串或null）

### 数据库字段约束

- **username**: 唯一索引，不允许重复
- **email**: 唯一索引，不允许重复
- **phone**: 唯一索引，不允许重复
- **password**: BCrypt加密存储

### 安全建议

1. **密码要求**: 建议前端提示用户设置强密码（包含大小写字母、数字、特殊字符）
2. **Token管理**: Token应妥善保存，建议使用localStorage或sessionStorage
3. **HTTPS**: 生产环境建议使用HTTPS加密传输
4. **登录限制**: 建议实施登录失败次数限制，防止暴力破解

---

## 更新日志

### v1.0.0 (2026-01-17)
- 新增用户注册接口
- 新增用户登录接口（支持用户名/邮箱/手机号三种方式）
- 新增修改密码接口
- 新增检查用户名/邮箱/手机号可用性接口
- 优化错误提示信息，提供更友好的用户体验
