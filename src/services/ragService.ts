import { getApiBaseUrl } from '../config'

interface MemoryDocument {
  id: number
  userId: string
  aiSessionId: string
  title: string
  description: string | null
  fileName: string
  fileContent: string
  messageCount: number
  chunkCount: number
  status: number
  source: string
  createTime: string
  updateTime: string
}

interface UploadResult {
  documentId: number
  title: string
  messageCount: number
  chunkCount: number
}

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

class RagService {
  private getBaseUrl(): string {
    return getApiBaseUrl()
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token')
    if (token) headers['Authorization'] = token
    return headers
  }

  async uploadMemoryFile(
    file: File,
    userId: string,
    aiSessionId?: string
  ): Promise<ApiResponse<UploadResult>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    if (aiSessionId) {
      formData.append('aiSessionId', aiSessionId)
    }

    const response = await fetch(`${this.getBaseUrl()}/rag/memory/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    })

    return response.json()
  }

  async uploadMemoryJson(
    jsonContent: any,
    userId: string,
    aiSessionId?: string
  ): Promise<ApiResponse<UploadResult>> {
    const params = new URLSearchParams()
    params.append('userId', userId)
    if (aiSessionId) {
      params.append('aiSessionId', aiSessionId)
    }

    const response = await fetch(
      `${this.getBaseUrl()}/rag/memory/upload-json?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(jsonContent),
      }
    )

    return response.json()
  }

  async getMemoryList(userId: string): Promise<ApiResponse<MemoryDocument[]>> {
    const params = new URLSearchParams()
    params.append('userId', userId)

    const response = await fetch(
      `${this.getBaseUrl()}/rag/memory/list?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    return response.json()
  }

  async getMemoryDetail(id: number): Promise<ApiResponse<MemoryDocument>> {
    const response = await fetch(`${this.getBaseUrl()}/rag/memory/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })

    return response.json()
  }

  async deleteMemory(id: number, userId: string): Promise<ApiResponse<null>> {
    const params = new URLSearchParams()
    params.append('userId', userId)

    const response = await fetch(
      `${this.getBaseUrl()}/rag/memory/${id}?${params.toString()}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    )

    return response.json()
  }
}

export const ragService = new RagService()
export type { MemoryDocument, UploadResult }
