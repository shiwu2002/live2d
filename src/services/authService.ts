/**
 * 用户认证服务
 * 处理用户注册、登录、密码管理等功能
 */

import type {
  RegisterRequest,
  LoginRequest,
  ChangePasswordRequest,
  UserInfo,
  ApiResponse,
  AvailabilityResponse
} from '../types/login'
import { getApiBaseUrl } from '../config'

export class AuthService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    // 优先使用传入的baseUrl，否则从配置文件读取
    this.baseUrl = baseUrl || getApiBaseUrl()
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<ApiResponse<UserInfo>> {
    try {
      // 验证参数
      if (!data.username || !data.password) {
        throw new Error('用户名和密码不能为空')
      }

      if (!data.email && !data.phone) {
        throw new Error('邮箱和手机号至少需要提供一个')
      }

      if (data.password.length < 6) {
        throw new Error('密码长度至少为6位')
      }

      // 构建表单数据
      const formData = new URLSearchParams()
      formData.append('username', data.username)
      formData.append('password', data.password)
      if (data.email) formData.append('email', data.email)
      if (data.phone) formData.append('phone', data.phone)

      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })

      const result: ApiResponse<UserInfo> = await response.json()

      if (result.code === 200 && result.data) {
        // 保存token和用户信息
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
      const token = this.getToken()
      if (!token) {
        throw new Error('请先登录')
      }

      // 验证参数
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': token
        },
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
   * 检查用户名是否可用
   */
  async checkUsername(username: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/auth/checkUsername?username=${encodeURIComponent(username)}`
      )
      const result: ApiResponse<AvailabilityResponse> = await response.json()
      return result.code === 200 && result.data?.available === true
    } catch (error) {
      console.error('[AuthService] 检查用户名失败:', error)
      return false
    }
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmail(email: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/auth/checkEmail?email=${encodeURIComponent(email)}`
      )
      const result: ApiResponse<AvailabilityResponse> = await response.json()
      return result.code === 200 && result.data?.available === true
    } catch (error) {
      console.error('[AuthService] 检查邮箱失败:', error)
      return false
    }
  }

  /**
   * 检查手机号是否可用
   */
  async checkPhone(phone: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/auth/checkPhone?phone=${encodeURIComponent(phone)}`
      )
      const result: ApiResponse<AvailabilityResponse> = await response.json()
      return result.code === 200 && result.data?.available === true
    } catch (error) {
      console.error('[AuthService] 检查手机号失败:', error)
      return false
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
   * 设置基础URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl
  }
}

// 导出单例
export const authService = new AuthService()
