/**
 * AI 模型配置服务
 * 提供与后端 AI 模型管理 API 的交互
 */

import { getApiBaseUrl } from '../config'
import { authService } from './authService'

// ==================== 类型定义 ====================

// 协议信息（用于前端模型选择器）
export interface ProtocolInfo {
  protocolType: string
  description: string
  healthy: boolean
  model: string
}

// 用户偏好信息
export interface UserPreference {
  userId: string
  preferredModel: string
  hasCustomPreference: boolean
  timestamp: number
}

// 用户客户端信息
export interface UserClientInfo {
  userId: string
  usingModel: string
  clientAvailable: boolean
  isCustomPreference: boolean
  timestamp: number
}

// 设置偏好响应
export interface SetPreferenceResponse {
  success: boolean
  message: string
  userId: string
  preferredModel: string
  timestamp: number
}

// 模型配置信息（来自 display API）
export interface ModelConfig {
  fullIdentifier: string
  protocolType: string
  protocolName: string
  modelName: string
  modelType: string
  description: string
  maxTokens?: number
  supportStream: boolean
  isDefault: boolean
  priority: number
  status?: number
  healthy?: boolean
}

// 完整模型配置信息
export interface FullModelConfig extends ModelConfig {
  id: number
  modelCode: string
  createTime: string
  updateTime: string
}

// 协议信息
export interface ProtocolInfo {
  protocolType: string
  protocolName: string
  modelCount: number
}

// 协议健康状态信息（来自 /api/ai/protocols）
export interface ProtocolHealthInfo {
  protocolType: string
  description: string
  healthy: boolean
  model: string
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

// 用户自定义模型
export interface UserCustomModel {
  id?: number
  userId: string
  modelName: string
  protocolType: string
  baseUrl: string
  modelId: string
  apiKey: string
  modelType: 'text' | 'multimodal'
  maxTokens?: number
  temperature?: number
  isDefault?: boolean
  status?: number
  createTime?: string
  updateTime?: string
  fullIdentifier?: string
}

// 展示列表中的自定义模型（来自 display-with-custom API）
export interface CustomModelDisplayInfo extends ModelConfig {
  isCustomModel: boolean
  customModelId?: number
}

// 切换响应
export interface SwitchResponse {
  success: boolean
  message: string
  currentModel: string
  protocolType: string
  modelCode: string
  modelName: string
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
   * 获取请求头（包含认证token）
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    const token = authService.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  /**
   * 执行带认证的请求
   */
  private async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers
      }
    })
  }

  /**
   * 获取所有可用的模型列表
   */
  async getAllModels(): Promise<ModelConfig[]> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/list`)
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/list/${vendorCode}`)
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/vendors`)
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/default`)
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/stream`)
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/display`)
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
   * 获取前端展示模型列表，并合并健康状态信息
   */
  async getDisplayModelsWithHealth(): Promise<ModelConfig[]> {
    try {
      // 先获取模型列表（使用 display API）
      const modelsResponse = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/display`)
      const modelsResult: ApiResponse<ModelConfig[]> = await modelsResponse.json()

      if (modelsResult.code !== 200) {
        console.error('获取展示模型列表失败:', modelsResult.message)
        return []
      }

      let models = modelsResult.data || []
      if (!Array.isArray(models)) {
        console.error('模型列表不是数组:', models)
        return []
      }

      // 尝试获取健康状态（可选，不影响模型列表展示）
      const healthMap = new Map<string, boolean>()
      try {
        const protocolsResponse = await this.fetchWithAuth(`${this.baseUrl}/api/ai/protocols`)
        const protocolsResult: ApiResponse<{ total: number; protocols: Record<string, { healthy: boolean; model: string }>; timestamp: number }> = await protocolsResponse.json()

        if (protocolsResult.code === 200 && protocolsResult.data && protocolsResult.data.protocols) {
          const protocolsData = protocolsResult.data.protocols
          // 将 Map 转换为我们需要的格式
          Object.keys(protocolsData).forEach(protocolType => {
            const protocolInfo = protocolsData[protocolType]
            if (protocolInfo && typeof protocolInfo.healthy === 'boolean') {
              healthMap.set(protocolType, protocolInfo.healthy)
            }
          })
        }
      } catch (err) {
        console.warn('获取协议健康状态失败（将忽略健康检查）:', err)
      }

      // 合并健康状态信息
      return models.map(model => {
        let healthy = true
        if (healthMap.size > 0) {
          healthy = healthMap.get(model.protocolType) ?? true
        }
        return {
          ...model,
          healthy
        }
      }).filter(model => {
        // display API 可能没有 status 字段，主要靠健康状态过滤
        if (model.status != null && model.status === 0) {
          return false
        }
        // 如果有健康状态，只显示健康的
        if (model.healthy != null && model.healthy === false) {
          return false
        }
        return true
      })
    } catch (error) {
      console.error('获取模型列表错误:', error)
      return []
    }
  }

  /**
   * 检查模型是否可用
   */
  async checkModel(fullIdentifier: string): Promise<boolean> {
    try {
      const encoded = encodeURIComponent(fullIdentifier)
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/check/${encoded}`)
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/detail/${encoded}`)
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

  /**
   * 获取协议列表（来自模型配置）
   */
  async getProtocols(): Promise<ProtocolInfo[]> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai-model-config/protocols`)
      const result: ApiResponse<ProtocolInfo[]> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取协议列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取协议列表错误:', error)
      return []
    }
  }

  /**
   * 获取协议健康状态
   */
  async getProtocolHealth(): Promise<ProtocolHealthInfo[]> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/protocols`)
      const result: ApiResponse<{ total: number; protocols: Record<string, { healthy: boolean; model: string; description?: string }>; timestamp: number }> = await response.json()

      if (result.code === 200 && result.data && result.data.protocols) {
        // 将 Map 转换为数组格式
        const protocolsMap = result.data.protocols
        return Object.keys(protocolsMap).map(protocolType => {
          const info = protocolsMap[protocolType]
          if (!info) {
            return null
          }
          return {
            protocolType,
            description: info.description || '',
            healthy: info.healthy,
            model: info.model
          }
        }).filter((item): item is NonNullable<typeof item> => item !== null)
      } else {
        console.error('获取协议健康状态失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取协议健康状态错误:', error)
      return []
    }
  }

  /**
   * 获取用户可用模型（含自定义模型）
   */
  async getDisplayModelsWithCustom(userId: string): Promise<CustomModelDisplayInfo[]> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/ai-model-config/display-with-custom?userId=${encodeURIComponent(userId)}`
      )
      const result: ApiResponse<CustomModelDisplayInfo[]> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取用户自定义模型列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取用户自定义模型列表错误:', error)
      return []
    }
  }

  /**
   * 获取用户自定义模型列表
   */
  async getUserCustomModels(userId: string): Promise<Map<string, any>[]> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/custom-model/list?userId=${encodeURIComponent(userId)}`
      )
      const result: ApiResponse<Map<string, any>[]> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取自定义模型列表失败:', result.message)
        return []
      }
    } catch (error) {
      console.error('获取自定义模型列表错误:', error)
      return []
    }
  }

  /**
   * 创建用户自定义模型
   */
  async createCustomModel(model: UserCustomModel): Promise<any | null> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/custom-model/create`, {
        method: 'POST',
        body: JSON.stringify(model)
      })
      const result: ApiResponse<any> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('创建自定义模型失败:', result.message)
        return null
      }
    } catch (error) {
      console.error('创建自定义模型错误:', error)
      return null
    }
  }

  /**
   * 更新用户自定义模型
   */
  async updateCustomModel(id: number, userId: string, model: UserCustomModel): Promise<any | null> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/custom-model/update/${id}?userId=${encodeURIComponent(userId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(model)
        }
      )
      const result: ApiResponse<any> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('更新自定义模型失败:', result.message)
        return null
      }
    } catch (error) {
      console.error('更新自定义模型错误:', error)
      return null
    }
  }

  /**
   * 删除用户自定义模型
   */
  async deleteCustomModel(id: number, userId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/custom-model/delete/${id}?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      const result: ApiResponse<any> = await response.json()

      if (result.code === 200) {
        return true
      } else {
        console.error('删除自定义模型失败:', result.message)
        return false
      }
    } catch (error) {
      console.error('删除自定义模型错误:', error)
      return false
    }
  }

  /**
   * 设置默认自定义模型
   */
  async setDefaultCustomModel(id: number, userId: string): Promise<boolean> {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/custom-model/set-default/${id}?userId=${encodeURIComponent(userId)}`,
        { method: 'POST' }
      )
      const result: ApiResponse<any> = await response.json()

      if (result.code === 200) {
        return true
      } else {
        console.error('设置默认模型失败:', result.message)
        return false
      }
    } catch (error) {
      console.error('设置默认模型错误:', error)
      return false
    }
  }

  /**
   * 检查模型是否可用
   */
  async checkModelAvailable(fullIdentifier: string): Promise<boolean> {
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
      console.error('检查模型可用性错误:', error)
      return false
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
   * 获取请求头（包含认证token）
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    const token = authService.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  /**
   * 执行带认证的请求
   */
  private async fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers
      }
    })
  }

  /**
   * 动态切换 AI 模型（全局）
   * @param model 模型标识符，格式："vendor:model"
   */
  async switchModel(model: string): Promise<SwitchResponse> {
    try {
      const encodedModel = encodeURIComponent(model)
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/ai/switch?model=${encodedModel}`,
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
   * 注意：根据新 API，使用 getProtocolHealth 替代
   */
  async getVendors(): Promise<{ total: number; vendors: Record<string, VendorStatus> }> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/protocols`)
      const result: ApiResponse<{ total: number; protocols: Record<string, VendorStatus>; timestamp: number }> = await response.json()

      if (result.code === 200 && result.data) {
        return {
          total: result.data.total,
          vendors: result.data.protocols
        }
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
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/current`)
      const result: ApiResponse<{
        cachedClients: Record<string, any>
        registeredProtocols: string[]
        availableProtocols: string[]
        timestamp: number
      }> = await response.json()

      if (result.code === 200) {
        // 兼容旧字段名
        const data = result.data
        return {
          cachedClients: data.cachedClients,
          registeredProviders: data.registeredProtocols || [],
          availableVendors: data.availableProtocols || [],
          timestamp: data.timestamp
        }
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
  async testModel(model: string, prompt?: string): Promise<{
    success: boolean
    model: string
    response?: string
    executionTime?: string
    promptLength?: number
    responseLength?: number
    timestamp: number
    error?: string
  }> {
    try {
      const encodedModel = encodeURIComponent(model)
      const encodedPrompt = prompt ? encodeURIComponent(prompt) : ''
      let url = `${this.baseUrl}/api/ai/test?model=${encodedModel}`
      if (encodedPrompt) {
        url += `&prompt=${encodedPrompt}`
      }

      const response = await this.fetchWithAuth(url, { method: 'POST' })
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
   * 清除指定缓存
   */
  async clearCache(key: string): Promise<void> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/cache/${encodeURIComponent(key)}`, {
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
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/cache/all`, {
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
   * 用户设置自己的模型偏好（新 API）
   */
  async setUserPreference(userId: string, model: string): Promise<SetPreferenceResponse> {
    try {
      const encodedModel = encodeURIComponent(model)
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/api/ai/user/preference?userId=${encodeURIComponent(userId)}&model=${encodedModel}`,
        { method: 'POST' }
      )
      const result: ApiResponse<SetPreferenceResponse> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('设置用户偏好失败:', result.message)
        throw new Error(result.message || '设置失败')
      }
    } catch (error) {
      console.error('设置用户偏好错误:', error)
      throw error
    }
  }

  /**
   * 获取用户当前的模型偏好（新 API）
   */
  async getUserPreference(userId: string): Promise<UserPreference | null> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/user/preference?userId=${encodeURIComponent(userId)}`)
      const result: ApiResponse<UserPreference> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取用户偏好失败:', result.message)
        return null
      }
    } catch (error) {
      console.error('获取用户偏好错误:', error)
      return null
    }
  }

  /**
   * 清除用户的模型偏好（恢复默认）（新 API）
   */
  async clearUserPreference(userId: string): Promise<SetPreferenceResponse> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/user/preference?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      })
      const result: ApiResponse<SetPreferenceResponse> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('清除用户偏好失败:', result.message)
        throw new Error(result.message || '清除失败')
      }
    } catch (error) {
      console.error('清除用户偏好错误:', error)
      throw error
    }
  }

  /**
   * 获取用户的 ChatClient（根据用户偏好自动选择）（新 API）
   */
  async getUserClient(userId: string): Promise<UserClientInfo | null> {
    try {
      const response = await this.fetchWithAuth(`${this.baseUrl}/api/ai/user/client?userId=${encodeURIComponent(userId)}`)
      const result: ApiResponse<UserClientInfo> = await response.json()

      if (result.code === 200) {
        return result.data
      } else {
        console.error('获取用户客户端失败:', result.message)
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
