import { getApiBaseUrl } from '../config'
import { fetchWithAuth } from './httpClient'
import type { CharacterInfoDto, CharacterInfo, Voice, PageResult, ApiResponse } from '../types/character'

class CharacterService {
  private getBaseUrl(): string {
    return getApiBaseUrl() + '/api/character'
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

  async create(data: CharacterInfoDto): Promise<ApiResponse<boolean>> {
    const res = await this.request(this.getBaseUrl(), {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async saveOrUpdate(data: CharacterInfoDto): Promise<ApiResponse<boolean>> {
    const res = await this.request(`${this.getBaseUrl()}/saveOrUpdate`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async get(): Promise<ApiResponse<CharacterInfo>> {
    const res = await this.request(this.getBaseUrl())
    return res.json()
  }

  async update(data: CharacterInfoDto): Promise<ApiResponse<boolean>> {
    const res = await this.request(this.getBaseUrl(), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async delete(): Promise<ApiResponse<boolean>> {
    const res = await this.request(this.getBaseUrl(), {
      method: 'DELETE',
    })
    return res.json()
  }

  async getPage(params: { pageNum?: number; pageSize?: number; name?: string }): Promise<ApiResponse<PageResult<CharacterInfo>>> {
    const query = new URLSearchParams()
    if (params.pageNum) query.set('pageNum', String(params.pageNum))
    if (params.pageSize) query.set('pageSize', String(params.pageSize))
    if (params.name) query.set('name', params.name)
    const res = await this.request(`${this.getBaseUrl()}/page?${query.toString()}`)
    return res.json()
  }

  async updateVoice(audioFileUrl: string): Promise<ApiResponse<string>> {
    const formData = new URLSearchParams()
    formData.append('audioFileUrl', audioFileUrl)
    const res = await fetchWithAuth(`${this.getBaseUrl()}/updateVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })
    return res.json()
  }

  async listVoices(): Promise<ApiResponse<Voice[]>> {
    const res = await this.request(`${this.getBaseUrl()}/listVoices`)
    return res.json()
  }

  async deleteVoice(voiceId: string): Promise<ApiResponse<boolean>> {
    const query = new URLSearchParams()
    query.set('voiceId', voiceId)
    const res = await this.request(`${this.getBaseUrl()}/deleteVoice?${query.toString()}`, {
      method: 'DELETE',
    })
    return res.json()
  }
}

export const characterService = new CharacterService()
