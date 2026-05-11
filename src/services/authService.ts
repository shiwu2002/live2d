/**
 * 用户认证服务
 * 处理用户注册、登录、密码管理等功能
 */

import type {
  RegisterRequest,
  LoginRequest,
  ChangePasswordRequest,
  ResetPasswordByEmailRequest,
  UserInfo,
  ApiResponse
} from '../types/login'
import { getApiBaseUrl } from '../config'

export class AuthService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl()
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = token
    }
    return headers
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<ApiResponse<UserInfo>> {
    try {
      // 验证参数（后端要求：邮箱必填，验证码必填）
      if (!data.username || !data.password) {
        throw new Error('用户名和密码不能为空')
      }

      if (!data.email) {
        throw new Error('邮箱为必填项')
      }

      if (!data.code) {
        throw new Error('邮箱验证码不能为空')
      }

      if (data.password.length < 6) {
        throw new Error('密码长度至少为6位')
      }

      // 构建表单数据
      const formData = new URLSearchParams()
      formData.append('username', data.username)
      formData.append('password', data.password)
      formData.append('email', data.email)
      formData.append('code', data.code)
      if (data.phone) formData.append('phone', data.phone)

      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData.toString()
      })

      const result: ApiResponse<UserInfo> = await response.json()

      if (result.code === 200 && result.data) {
        // 保存token和用户信息
        this.saveAuthData(result.data)
      }

      return result
    } catch (error) {
      console.error('[AuthService] 注册失败:', error)
      return {
        code: 500,
        msg: error instanceof Error ? error.message : '注册失败',
        data: null
      }
    }
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<ApiResponse<UserInfo>> {
    try {
      // 验证参数
      if (!data.loginIdentifier || !data.password) {
        throw new Error('登录账号和密码不能为空')
      }
  
      // 构建表单数据
      const formData = new URLSearchParams()
      formData.append('loginIdentifier', data.loginIdentifier)
      formData.append('password', data.password)
  
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData.toString()
      })
  
      // 先检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
  
      // 尝试解析 JSON
      const text = await response.text()
      let result: ApiResponse<UserInfo>
      try {
        result = JSON.parse(text)
      } catch (e) {
        console.error('[AuthService] 登录响应解析失败，原始响应:', text)
        throw new Error('服务器响应格式错误')
      }
  
      if (result.code === 200 && result.data) {
        // 保存 token 和用户信息
        this.saveAuthData(result.data)
      }
  
      return result
    } catch (error) {
      console.error('[AuthService] 登录失败:', error)
      return {
        code: 500,
        msg: error instanceof Error ? error.message : '登录失败',
        data: null
      }
    }
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<string>> {
    try {
      if (!data.oldPassword || !data.newPassword) {
        throw new Error('旧密码和新密码不能为空')
      }

      if (data.newPassword.length < 6) {
        throw new Error('新密码长度至少为6位')
      }

      // 构建表单数据
      const formData = new URLSearchParams()
      formData.append('oldPassword', data.oldPassword)
      formData.append('newPassword', data.newPassword)

      const response = await fetch(`${this.baseUrl}/auth/changePassword`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData.toString()
      })

      const result: ApiResponse<string> = await response.json()
      return result
    } catch (error) {
      console.error('[AuthService] 修改密码失败:', error)
      return {
        code: 500,
        msg: error instanceof Error ? error.message : '修改密码失败',
        data: null
      }
    }
  }

  /**
   * 保存认证数据到localStorage
   */
  private saveAuthData(userInfo: UserInfo): void {
    localStorage.setItem('auth_token', userInfo.token)
    localStorage.setItem('user_info', JSON.stringify(userInfo))
    console.log('[AuthService] 已保存认证数据')
  }

  /**
   * 获取保存的token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  /**
   * 获取保存的用户信息
   */
  getUserInfo(): UserInfo | null {
    const userInfoStr = localStorage.getItem('user_info')
    if (!userInfoStr) return null

    try {
      return JSON.parse(userInfoStr)
    } catch (error) {
      console.error('[AuthService] 解析用户信息失败:', error)
      return null
    }
  }

  /**
   * 退出登录
   */
  logout(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    console.log('[AuthService] 已退出登录')
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    const token = this.getToken()
    const userInfo = this.getUserInfo()
    return !!token && !!userInfo
  }

  /**
   * 发送注册邮箱验证码
   */
  async sendEmailCode(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      if (!email) {
        throw new Error('邮箱不能为空')
      }
      const formData = new URLSearchParams()
      formData.append('email', email)

      const response = await fetch(`${this.baseUrl}/auth/sendEmailCode`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData.toString()
      })

      const result: ApiResponse<{ message: string }> = await response.json()
      return result
    } catch (error) {
      console.error('[AuthService] 发送注册邮箱验证码失败:', error)
      return {
        code: 500,
        msg: error instanceof Error ? error.message : '发送验证码失败',
        data: null
      }
    }
  }

  /**
   * 发送找回密码邮箱验证码
   */
  async sendResetEmailCode(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      if (!email) {
        throw new Error('邮箱不能为空')
      }
      const formData = new URLSearchParams()
      formData.append('email', email)

      const response = await fetch(`${this.baseUrl}/auth/sendResetEmailCode`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData.toString()
      })

      const result: ApiResponse<{ message: string }> = await response.json()
      return result
    } catch (error) {
      console.error('[AuthService] 发送找回密码验证码失败:', error)
      return {
        code: 500,
        msg: error instanceof Error ? error.message : '发送验证码失败',
        data: null
      }
    }
  }

  /**
   * 通过邮箱验证码重置密码
   */
  async resetPasswordByEmail(data: ResetPasswordByEmailRequest): Promise<ApiResponse<string>> {
    try {
      // 参数校验
      if (!data.email) {
        throw new Error('邮箱不能为空')
      }
      if (!data.code) {
        throw new Error('邮箱验证码不能为空')
      }
      if (!data.newPassword || data.newPassword.length < 6) {
        throw new Error('新密码长度至少为6位')
      }

      const formData = new URLSearchParams()
      formData.append('email', data.email)
      formData.append('code', data.code)
      formData.append('newPassword', data.newPassword)

      const response = await fetch(`${this.baseUrl}/auth/resetPasswordByEmail`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData.toString()
      })

      const result: ApiResponse<string> = await response.json()
      return result
    } catch (error) {
      console.error('[AuthService] 通过邮箱验证码重置密码失败:', error)
      return {
        code: 500,
        msg: error instanceof Error ? error.message : '重置密码失败',
        data: null
      }
    }
  }

  /**
   * 设置基础URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl
  }
}

// 导出单例
export const authService = new AuthService()
