import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'

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

  async uploadMemoryFile(
    file: File,
    aiSessionId?: string
  ): Promise<ApiResponse<UploadResult>> {
    const formData = new FormData()
    formData.append('file', file)
    if (aiSessionId) {
      formData.append('aiSessionId', aiSessionId)
    }

    const response = await fetchWithAuth(`${this.getBaseUrl()}/rag/memory/upload`, {
      method: 'POST',
      body: formData,
    })

    return response.json()
  }

  async uploadMemoryJson(
    jsonContent: any,
    aiSessionId?: string
  ): Promise<ApiResponse<UploadResult>> {
    const params = new URLSearchParams()
    if (aiSessionId) {
      params.append('aiSessionId', aiSessionId)
    }

    const response = await fetchWithAuth(
      `${this.getBaseUrl()}/rag/memory/upload-json?${params.toString()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonContent),
      }
    )

    return response.json()
  }

  async getMemoryList(): Promise<ApiResponse<MemoryDocument[]>> {
    const response = await fetchWithAuth(`${this.getBaseUrl()}/rag/memory/list`)
    return response.json()
  }

  async getMemoryDetail(id: number): Promise<ApiResponse<MemoryDocument>> {
    const response = await fetchWithAuth(`${this.getBaseUrl()}/rag/memory/${id}`)
    return response.json()
  }

  async deleteMemory(id: number): Promise<ApiResponse<null>> {
    const response = await fetchWithAuth(`${this.getBaseUrl()}/rag/memory/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  }
}

export const ragService = new RagService()
export type { MemoryDocument, UploadResult }
