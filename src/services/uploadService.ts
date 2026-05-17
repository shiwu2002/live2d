import { getApiBaseUrl } from '../config'
import { authService } from './authService'

class UploadService {
  private getBaseUrl(): string {
    return getApiBaseUrl()
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    const token = authService.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  async uploadImage(file: File): Promise<{ code: number; msg: string; data: string | null }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${this.getBaseUrl()}/file/uploadImage`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    })
    return res.json()
  }

  async uploadAudio(file: File): Promise<{ code: number; msg: string; data: string | null }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${this.getBaseUrl()}/file/uploadAudio`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    })
    return res.json()
  }
}

export const uploadService = new UploadService()
