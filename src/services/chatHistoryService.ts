import { getApiBaseUrl } from '../config'
import { authService } from './authService'

export interface HistoryRecord {
  id: number
  sessionId: string
  sender: string
  messageType: string
  content: string
  createTime: string
}

export interface HistoryPage {
  records: HistoryRecord[]
  nextId: number | null
}

class ChatHistoryService {
  private getBaseUrl(): string {
    return getApiBaseUrl()
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    const token = authService.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  async fetchHistory(userId: string, lastId?: number, pageSize = 20): Promise<HistoryPage> {
    const params = new URLSearchParams()
    if (lastId !== undefined && lastId > 0) params.append('lastId', String(lastId))
    params.append('pageSize', String(pageSize))

    const res = await fetch(
      `${this.getBaseUrl()}/api/session/user/${encodeURIComponent(userId)}/history/keyset?${params}`,
      { headers: this.getAuthHeaders() }
    )
    const json = await res.json()
    if (json.code !== 200) throw new Error(json.msg || '加载历史失败')
    return json.data
  }
}

export const chatHistoryService = new ChatHistoryService()
