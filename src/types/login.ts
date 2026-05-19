/**
 * 登录相关类型定义
 */

// 用户登录信息
export interface UserLoginInfo {
  openid: string             // 用户唯一标识
  nickname?: string          // 用户昵称
  avatar?: string            // 用户头像
  sessionId: string          // 会话ID
  token?: string             // 登录token（可选）
}

// ============ 用户名密码登录相关类型 ============

// 用户注册请求
export interface RegisterRequest {
  username: string           // 用户名
  password: string           // 密码
  email: string              // 邮箱（必填）
  phone?: string             // 手机号（可选）
  code: string               // 邮箱验证码（必填）
}

// 用户登录请求
export interface LoginRequest {
  loginIdentifier: string    // 登录标识（用户名/邮箱/手机号）
  password: string           // 密码
}

// 修改密码请求
export interface ChangePasswordRequest {
  oldPassword: string        // 旧密码
  newPassword: string        // 新密码
}

// 通过邮箱验证码重置密码请求
export interface ResetPasswordByEmailRequest {
  email: string              // 邮箱
  code: string               // 邮箱验证码
  newPassword: string        // 新密码
}

// 用户信息（完整）
export interface UserInfo {
  userId: string             // 用户ID
  username: string           // 用户名
  email?: string            // 邮箱
  phone?: string            // 手机号
  nickname?: string         // 昵称
  avatar?: string           // 头像
  token: string             // JWT Token
  aiSessionId: string       // AI会话ID
}

// API响应通用格式
export interface ApiResponse<T = any> {
  code: number              // 状态码
  msg: string               // 响应消息
  data: T | null            // 响应数据
}

// 可用性检查响应
export interface AvailabilityResponse {
  available: boolean        // 是否可用
}

// 登录方式
export const LoginMethod = {
  USERNAME: 'username',     // 用户名密码登录
  WECHAT: 'wechat'         // 微信小程序登录
} as const

export type LoginMethod = typeof LoginMethod[keyof typeof LoginMethod]
