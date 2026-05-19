import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'

export interface VoiceModel {
  id?: number
  userId?: string
  modelType: 'tts' | 'asr'
  modelName: string
  baseUrl: string
  modelId: string
  apiKey?: string
  hasApiKey?: boolean
  voice?: string
  format?: string
  sampleRate?: number
  streamMode?: 'none' | 'stream'
  isDefault?: boolean
  status?: number
  fullIdentifier?: string
  createTime?: string
  updateTime?: string
}

interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
}

class VoiceModelService {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBaseUrl()
  }

  private async request(url: string, options?: RequestInit): Promise<Response> {
    return fetchWithAuth(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async getList(): Promise<VoiceModel[]> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/list`)
      const result: ApiResponse<VoiceModel[]> = await response.json()
      if (result.code === 200) {
        return result.data || []
      }
      return []
    } catch (error) {
      console.error('获取语音模型列表失败:', error)
      return []
    }
  }

  async getListByType(modelType: 'tts' | 'asr'): Promise<VoiceModel[]> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/list/${modelType}`)
      const result: ApiResponse<VoiceModel[]> = await response.json()
      if (result.code === 200) {
        return result.data || []
      }
      return []
    } catch (error) {
      console.error(`获取${modelType.toUpperCase()}模型列表失败:`, error)
      return []
    }
  }

  async getDetail(id: number): Promise<VoiceModel | null> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/detail/${id}`)
      const result: ApiResponse<VoiceModel> = await response.json()
      if (result.code === 200) {
        return result.data
      }
      return null
    } catch (error) {
      console.error('获取语音模型详情失败:', error)
      return null
    }
  }

  async create(model: VoiceModel): Promise<VoiceModel | null> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/create`, {
        method: 'POST',
        body: JSON.stringify(model)
      })
      const result: ApiResponse<VoiceModel> = await response.json()
      if (result.code === 200) {
        return result.data
      }
      console.error('创建语音模型失败:', result.msg)
      return null
    } catch (error) {
      console.error('创建语音模型错误:', error)
      return null
    }
  }

  async update(id: number, model: Partial<VoiceModel>): Promise<boolean> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/update/${id}`, {
        method: 'PUT',
        body: JSON.stringify(model)
      })
      const result: ApiResponse<any> = await response.json()
      return result.code === 200
    } catch (error) {
      console.error('更新语音模型错误:', error)
      return false
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/delete/${id}`, { method: 'DELETE' })
      const result: ApiResponse<any> = await response.json()
      return result.code === 200
    } catch (error) {
      console.error('删除语音模型错误:', error)
      return false
    }
  }

  async setDefault(id: number): Promise<boolean> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/set-default/${id}`, { method: 'POST' })
      const result: ApiResponse<any> = await response.json()
      return result.code === 200
    } catch (error) {
      console.error('设置默认语音模型错误:', error)
      return false
    }
  }

  async testTts(id: number, text?: string): Promise<{ success: boolean; audioUrl?: string; executionTime?: string } | null> {
    try {
      const queryText = text || '你好，这是一段测试语音。'
      const url = `${this.baseUrl}/api/voice-model/test-tts/${id}?text=${encodeURIComponent(queryText)}`
      const response = await this.request(url, { method: 'POST' })
      const result: ApiResponse<any> = await response.json()
      if (result.code === 200 && result.data?.success) {
        return {
          success: true,
          executionTime: result.data.executionTime,
          audioUrl: result.data.audioUrl
        }
      }
      return { success: false }
    } catch (error) {
      console.error('测试TTS模型错误:', error)
      return null
    }
  }

  async testAsr(id: number): Promise<{ success: boolean } | null> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/test-asr/${id}`, { method: 'POST' })
      const result: ApiResponse<any> = await response.json()
      if (result.code === 200 && result.data?.success) {
        return { success: true }
      }
      return { success: false }
    } catch (error) {
      console.error('测试ASR模型错误:', error)
      return null
    }
  }

  async getUserTtsConfig(): Promise<VoiceModel | null> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/user/tts`)
      const result: ApiResponse<any> = await response.json()
      if (result.code === 200 && result.data?.hasCustomTts) {
        return result.data as VoiceModel
      }
      return null
    } catch (error) {
      console.error('获取用户TTS配置失败:', error)
      return null
    }
  }

  async getUserAsrConfig(): Promise<VoiceModel | null> {
    try {
      const response = await this.request(`${this.baseUrl}/api/voice-model/user/asr`)
      const result: ApiResponse<any> = await response.json()
      if (result.code === 200 && result.data?.hasCustomAsr) {
        return result.data as VoiceModel
      }
      return null
    } catch (error) {
      console.error('获取用户ASR配置失败:', error)
      return null
    }
  }
}

export const voiceModelService = new VoiceModelService()
