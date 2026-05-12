export interface CharacterInfoDto {
  userId: string
  name: string
  gender?: 'male' | 'female' | 'other'
  description?: string
  background?: string
  personalityTraits?: string
  behaviorStyle?: string
  languageStyle?: string
  outputFormat?: string
  systemPrompt?: string
  images?: string
}

export interface CharacterInfo extends CharacterInfoDto {
  voice?: string
  createTime?: string
  updateTime?: string
}

export interface Voice {
  voiceId: string
  voiceName?: string
  createTime?: string
  [key: string]: any
}

export interface PageResult<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T | null
}
