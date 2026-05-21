import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'

export interface Live2DModelInfo {
  id: string
  name: string
  modelUrl: string
  previewImage?: string
  isDefault: boolean
  ownerId?: string
  createdAt: string
  fileSize?: number
  fileCount?: number
}

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

let apiAvailable: boolean | null = null
let lastCheckTime = 0
const CHECK_INTERVAL = 5 * 60 * 1000

class Live2DModelService {
  private getBaseUrl(): string {
    return getApiBaseUrl()
  }

  async list(): Promise<Live2DModelInfo[]> {
    const now = Date.now()
    if (apiAvailable === false && now - lastCheckTime < CHECK_INTERVAL) {
      return []
    }
    try {
      const res = await fetchWithAuth(`${this.getBaseUrl()}/api/live2d-model/list`)
      const json: ApiResponse<Live2DModelInfo[]> = await res.json()
      if (json.code === 200 && json.data) {
        apiAvailable = true
        return json.data
      }
      apiAvailable = false
      lastCheckTime = now
      return []
    } catch {
      apiAvailable = false
      lastCheckTime = now
      console.warn('远程模型列表获取失败，使用本地模型')
      return []
    }
  }

  async upload(zipFile: File, name?: string): Promise<Live2DModelInfo> {
    const formData = new FormData()
    formData.append('file', zipFile)
    if (name) {
      formData.append('name', name)
    }
    const res = await fetchWithAuth(`${this.getBaseUrl()}/api/live2d-model/upload`, {
      method: 'POST',
      body: formData,
    })
    const json: ApiResponse<Live2DModelInfo> = await res.json()
    if (json.code !== 200) {
      throw new Error(json.msg || '上传失败')
    }
    return json.data
  }

  async remove(modelId: string): Promise<void> {
    const res = await fetchWithAuth(`${this.getBaseUrl()}/api/live2d-model/${modelId}`, {
      method: 'DELETE',
    })
    const json: ApiResponse<null> = await res.json()
    if (json.code !== 200) {
      throw new Error(json.msg || '删除失败')
    }
  }

  resetApiStatus(): void {
    apiAvailable = null
    lastCheckTime = 0
  }
}

export const live2dModelService = new Live2DModelService()
