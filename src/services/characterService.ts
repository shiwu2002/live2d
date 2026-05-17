import { getApiBaseUrl } from '../config'
import { authService } from './authService'
import type { CharacterInfoDto, CharacterInfo, Voice, PageResult, ApiResponse } from '../types/character'

class CharacterService {
  private getBaseUrl(): string {
    return getApiBaseUrl() + '/api/character'
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = authService.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  async create(data: CharacterInfoDto): Promise<ApiResponse<boolean>> {
    const res = await fetch(this.getBaseUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async saveOrUpdate(data: CharacterInfoDto): Promise<ApiResponse<boolean>> {
    const res = await fetch(`${this.getBaseUrl()}/saveOrUpdate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async getByUserId(userId: string): Promise<ApiResponse<CharacterInfo>> {
    const res = await fetch(`${this.getBaseUrl()}/${encodeURIComponent(userId)}`, {
      headers: this.getHeaders(),
    })
    return res.json()
  }

  async update(data: CharacterInfoDto): Promise<ApiResponse<boolean>> {
    const res = await fetch(this.getBaseUrl(), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async delete(userId: string): Promise<ApiResponse<boolean>> {
    const res = await fetch(`${this.getBaseUrl()}/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
    return res.json()
  }

  async getPage(params: { pageNum?: number; pageSize?: number; userId?: string; name?: string }): Promise<ApiResponse<PageResult<CharacterInfo>>> {
    const query = new URLSearchParams()
    if (params.pageNum) query.set('pageNum', String(params.pageNum))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    if (params.userId) query.set('userId', params.userId)
    if (params.name) query.set('name', params.name)
    const res = await fetch(`${this.getBaseUrl()}/page?${query.toString()}`, {
      headers: this.getHeaders(),
    })
    return res.json()
  }

  async updateVoice(userId: string, audioFileUrl: string): Promise<ApiResponse<string>> {
    const formData = new URLSearchParams()
    formData.append('userId', userId)
    formData.append('audioFileUrl', audioFileUrl)
    const token = authService.getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${this.getBaseUrl()}/updateVoice`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    return res.json()
  }

  async listVoices(userId: string): Promise<ApiResponse<Voice[]>> {
    const res = await fetch(`${this.getBaseUrl()}/listVoices/${encodeURIComponent(userId)}`, {
      headers: this.getHeaders(),
    })
    return res.json()
  }

  async deleteVoice(userId: string, voiceId: string): Promise<ApiResponse<boolean>> {
    const query = new URLSearchParams()
    query.set('userId', userId)
    query.set('voiceId', voiceId)
    const res = await fetch(`${this.getBaseUrl()}/deleteVoice?${query.toString()}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
    return res.json()
  }
}

export const characterService = new CharacterService()
