import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'

class UploadService {
  private getBaseUrl(): string {
    return getApiBaseUrl()
  }

  async uploadImage(file: File): Promise<{ code: number; msg: string; data: string | null }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetchWithAuth(`${this.getBaseUrl()}/file/uploadImage`, {
      method: 'POST',
      body: formData,
    })
    return res.json()
  }

  async uploadAudio(file: File): Promise<{ code: number; msg: string; data: string | null }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetchWithAuth(`${this.getBaseUrl()}/file/uploadAudio`, {
      method: 'POST',
      body: formData,
    })
    return res.json()
  }
}

export const uploadService = new UploadService()
