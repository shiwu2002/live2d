/**
 * 登录相关类型定义
 */

// 扫码登录状态
export const QRCodeLoginStatus = {
  PENDING: 'pending',        // 等待扫码
  SCANNED: 'scanned',        // 已扫码
  CONFIRMED: 'confirmed',    // 已确认
  EXPIRED: 'expired',        // 已过期
  CANCELED: 'canceled'       // 已取消
} as const

export type QRCodeLoginStatus = typeof QRCodeLoginStatus[keyof typeof QRCodeLoginStatus]

// 登录二维码信息
export interface QRCodeInfo {
  qrcodeId: string           // 二维码唯一标识
  qrcodeUrl: string          // 二维码数据URL
  status: QRCodeLoginStatus  // 当前状态
  expireTime: number         // 过期时间戳
  createTime: number         // 创建时间戳
}

// 用户登录信息
export interface UserLoginInfo {
  openid: string             // 用户唯一标识
  nickname?: string          // 用户昵称
  avatar?: string            // 用户头像
  sessionId: string          // 会话ID
  token?: string             // 登录token（可选）
}

// 扫码登录响应
export interface QRCodeLoginResponse {
  success: boolean
  status: QRCodeLoginStatus
  message?: string
  userInfo?: UserLoginInfo
}

// WebSocket消息类型
export const WSMessageType = {
  QR_CREATE: 'qr_create',           // 创建二维码
  QR_SCAN: 'qr_scan',               // 扫码通知
  QR_CONFIRM: 'qr_confirm',         // 确认登录
  QR_CANCEL: 'qr_cancel',           // 取消登录
  QR_EXPIRE: 'qr_expire',           // 二维码过期
  LOGIN_SUCCESS: 'login_success',   // 登录成功
  LOGIN_FAILED: 'login_failed'      // 登录失败
} as const

export type WSMessageType = typeof WSMessageType[keyof typeof WSMessageType]

// WebSocket消息
export interface WSMessage {
  type: WSMessageType
  qrcodeId?: string
  userInfo?: UserLoginInfo
  timestamp: number
  data?: any
}

// ============ 用户名密码登录相关类型 ============

// 用户注册请求
export interface RegisterRequest {
  username: string           // 用户名
  password: string           // 密码
  email?: string            // 邮箱（可选）
  phone?: string            // 手机号（可选）
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
  QRCODE: 'qrcode',        // 扫码登录
  WECHAT: 'wechat'         // 微信小程序登录
} as const

export type LoginMethod = typeof LoginMethod[keyof typeof LoginMethod]
