/**
 * AI 模型配置服务
 * 提供与后端 AI 模型管理 API 的交互
 */

import { getApiBaseUrl } from '../config'

// ==================== 类型定义 ====================

// 模型配置信息
export interface ModelConfig {
  fullIdentifier: string
  vendorCode: string
  vendorName: string
  modelName: string
  modelType: string
  description: string
  status: number
  isDefault: boolean
  supportStream: boolean
  priceTier: string
  performanceLevel: string
  tags: string
  priority: number
}

// 厂商信息
export interface VendorInfo {
  vendorCode: string
  vendorName: string
  modelCount: number
  hasDefault: boolean
}

// 厂商状态信息
export interface VendorStatus {
  configured: boolean
  model: string
  baseUrl: string
  temperature: number
  stream: boolean
  healthy: boolean
}

// 切换响应
export interface SwitchResponse {
  success: boolean
  message: string
  currentVendor: string
  vendorName: string
  model: string
  timestamp: number
}

// API 响应包装器
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

// ==================== AI 模型配置服务 ====================

export class AiModelConfigService {
  private baseUrl: string

  constructor() {
    // 开发环境下使用空字符串（相对路径），生产环境使用完整地址
    this.baseUrl = getApiBaseUrl()
  }

  /**
   * 获取所有可用的模型列表
   */
  async getAllModels(): Promise<ModelConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/list`)
      const result: ApiResponse<ModelConfig[]> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取模型列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取模型列表错误:', error)
      return []
    }
  }

  /**
   * 获取指定厂商的所有模型
   */
  async getModelsByVendor(vendorCode: string): Promise<ModelConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/list/${vendorCode}`)
      const result: ApiResponse<ModelConfig[]> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error(`获取${vendorCode}厂商模型列表失败:`, result.message)
        return []
      }
    } catch (error) {
      console.error(`获取${vendorCode}厂商模型列表错误:`, error)
      return []
    }
  }

  /**
   * 获取所有支持的厂商列表
   */
  async getAllVendors(): Promise<VendorInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/vendors`)
      const result: ApiResponse<VendorInfo[]> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取厂商列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取厂商列表错误:', error)
      return []
    }
  }

  /**
   * 获取默认推荐的模型
   */
  async getDefaultModel(): Promise<ModelConfig | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/default`)
      const result: ApiResponse<ModelConfig[]> = await response.json()
      
      if (result.code === 200 && result.data.length > 0) {
        return result.data[0] ?? null
      } else {
        return null
      }
    } catch (error) {
      console.error('获取默认模型错误:', error)
      return null
    }
  }

  /**
   * 获取支持流式的模型
   */
  async getStreamModels(): Promise<ModelConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/stream`)
      const result: ApiResponse<ModelConfig[]> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取流式模型列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取流式模型列表错误:', error)
      return []
    }
  }

  /**
   * 获取前端展示优化后的模型列表
   */
  async getDisplayModels(): Promise<ModelConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/display`)
      const result: ApiResponse<ModelConfig[]> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取展示模型列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取展示模型列表错误:', error)
      return []
    }
  }

  /**
   * 检查模型是否可用
   */
  async checkModel(fullIdentifier: string): Promise<boolean> {
    try {
      const encoded = encodeURIComponent(fullIdentifier)
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/check/${encoded}`)
      const result: ApiResponse<{ fullIdentifier: string; available: boolean }> = await response.json()
      
      if (result.code === 200) {
        return result.data.available
      } else {
        return false
      }
    } catch (error) {
      console.error('检查模型错误:', error)
      return false
    }
  }

  /**
   * 获取单个模型详情
   */
  async getModelDetail(fullIdentifier: string): Promise<ModelConfig | null> {
    try {
      const encoded = encodeURIComponent(fullIdentifier)
      const response = await fetch(`${this.baseUrl}/api/ai-model-config/detail/${encoded}`)
      const result: ApiResponse<ModelConfig> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取模型详情失败:', result.message)
        return null
      }
    } catch (error) {
      console.error('获取模型详情错误:', error)
      return null
    }
  }
}

// ==================== AI 模型切换服务 ====================

export class AiModelSwitchService {
  private baseUrl: string

  constructor() {
    // 开发环境下使用空字符串（相对路径），生产环境使用完整地址
    this.baseUrl = getApiBaseUrl()
  }

  /**
   * 动态切换 AI 模型（全局）
   * @param vendor 厂商标识，支持两种格式：
   * - "vendor" - 使用默认模型
   * - "vendor:model" - 使用指定模型
   */
  async switchModel(vendor: string): Promise<SwitchResponse> {
    try {
      const encodedVendor = encodeURIComponent(vendor)
      const response = await fetch(
        `${this.baseUrl}/api/ai/switch?vendor=${encodedVendor}`,
        { method: 'POST' }
      )
      const result: ApiResponse<SwitchResponse> = await response.json()
      
      if (result.code === 200) {
        console.log('模型切换成功:', result.data)
        return result.data
      } else {
        console.error('模型切换失败:', result.message)
        throw new Error(result.message || '模型切换失败')
      }
    } catch (error) {
      console.error('模型切换错误:', error)
      throw error
    }
  }

  /**
   * 获取当前可用的 AI 厂商列表
   */
  async getVendors(): Promise<{ total: number; vendors: Record<string, VendorStatus> }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/vendors`)
      const result: ApiResponse<{ total: number; vendors: Record<string, VendorStatus> }> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取厂商列表失败:', result.message)
        return { total: 0, vendors: {} }
      }
    } catch (error) {
      console.error('获取厂商列表错误:', error)
      return { total: 0, vendors: {} }
    }
  }

  /**
   * 获取当前正在使用的 AI 模型信息
   */
  async getCurrentModel(): Promise<{
    cachedClients: Record<string, any>
    registeredProviders: string[]
    availableVendors: string[]
    timestamp: number
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/current`)
      const result: ApiResponse<{
        cachedClients: Record<string, any>
        registeredProviders: string[]
        availableVendors: string[]
        timestamp: number
      }> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取当前模型失败:', result.message)
        return {
          cachedClients: {},
          registeredProviders: [],
          availableVendors: [],
          timestamp: Date.now()
        }
      }
    } catch (error) {
      console.error('获取当前模型错误:', error)
      return {
        cachedClients: {},
        registeredProviders: [],
        availableVendors: [],
        timestamp: Date.now()
      }
    }
  }

  /**
   * 测试指定 AI 模型是否可用
   */
  async testModel(vendor: string, prompt?: string): Promise<{
    success: boolean
    vendor: string
    response?: string
    executionTime?: string
    promptLength?: number
    responseLength?: number
    timestamp: number
  }> {
    try {
      const encodedVendor = encodeURIComponent(vendor)
      const encodedPrompt = prompt ? encodeURIComponent(prompt) : ''
      const url = encodedPrompt 
        ? `${this.baseUrl}/api/ai/test?vendor=${encodedVendor}&prompt=${encodedPrompt}`
        : `${this.baseUrl}/api/ai/test?vendor=${encodedVendor}`
      
      const response = await fetch(url, { method: 'POST' })
      const result: ApiResponse<any> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        console.error('测试模型失败:', result.message)
        throw new Error(result.message || '测试失败')
      }
    } catch (error) {
      console.error('测试模型错误:', error)
      throw error
    }
  }

  /**
   * 清除指定厂商的缓存
   */
  async clearCache(vendor: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/cache/${vendor}`, { 
        method: 'DELETE' 
      })
      const result: ApiResponse<any> = await response.json()
      
      if (result.code !== 200) {
        console.error('清除缓存失败:', result.message)
      }
    } catch (error) {
      console.error('清除缓存错误:', error)
    }
  }

  /**
   * 清除所有厂商的缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/cache/all`, { 
        method: 'DELETE' 
      })
      const result: ApiResponse<any> = await response.json()
      
      if (result.code !== 200) {
        console.error('清除所有缓存失败:', result.message)
      }
    } catch (error) {
      console.error('清除所有缓存错误:', error)
    }
  }

  /**
   * 用户设置自己的模型偏好
   */
  async setUserPreference(userId: string, vendor: string): Promise<void> {
    try {
      const encodedVendor = encodeURIComponent(vendor)
      const response = await fetch(
        `${this.baseUrl}/api/ai/user/preference?userId=${userId}&vendor=${encodedVendor}`,
        { method: 'POST' }
      )
      const result: ApiResponse<any> = await response.json()
      
      if (result.code !== 200) {
        console.error('设置用户偏好失败:', result.message)
        throw new Error(result.message || '设置失败')
      }
    } catch (error) {
      console.error('设置用户偏好错误:', error)
      throw error
    }
  }

  /**
   * 获取用户当前的模型偏好
   */
  async getUserPreference(userId: string): Promise<{
    userId: string
    preferredVendor: string
    hasCustomPreference: boolean
    timestamp: number
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/user/preference?userId=${userId}`)
      const result: ApiResponse<any> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        return null
      }
    } catch (error) {
      console.error('获取用户偏好错误:', error)
      return null
    }
  }

  /**
   * 清除用户的模型偏好（恢复默认）
   */
  async clearUserPreference(userId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/user/preference?userId=${userId}`, {
        method: 'DELETE'
      })
      const result: ApiResponse<any> = await response.json()
      
      if (result.code !== 200) {
        console.error('清除用户偏好失败:', result.message)
      }
    } catch (error) {
      console.error('清除用户偏好错误:', error)
    }
  }

  /**
   * 获取用户的 ChatClient（根据用户偏好自动选择）
   */
  async getUserClient(userId: string): Promise<{
    userId: string
    usingVendor: string
    clientAvailable: boolean
    isCustomPreference: boolean
    timestamp: number
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/user/client?userId=${userId}`)
      const result: ApiResponse<any> = await response.json()
      
      if (result.code === 200) {
        return result.data
      } else {
        return null
      }
    } catch (error) {
      console.error('获取用户客户端错误:', error)
      return null
    }
  }
}

// ==================== 导出单例 ====================

export const aiModelConfigService = new AiModelConfigService()
export const aiModelSwitchService = new AiModelSwitchService()
