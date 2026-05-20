/**
 * 用户粘性功能服务
 * 处理好感度、日记、生活事件等用户粘性相关的 API 调用
 */

import { fetchWithAuth } from './httpClient'
import { getApiBaseUrl } from '../config'

// 好感度信息接口
export interface RelationshipData {
  favorability: number // 好感度值（0-100）
  levelName: string // 等级名称：陌生 / 熟悉 / 亲密 / 羁绊
  totalInteractions: number // 累计互动次数
}

// 日记条目接口
export interface DiaryEntry {
  id: number
  sessionId: string
  userId: string
  sender: string
  messageType: string
  content: string
  createTime: string
}

// 好感度等级配置
export const FAVORABILITY_LEVELS = {
  0: { name: '陌生', color: '#9ca3af', icon: '🤍', stars: 1 },
  21: { name: '熟悉', color: '#60a5fa', colorName: '蓝色', icon: '💙', stars: 2 },
  51: { name: '亲密', color: '#f472b6', colorName: '粉色', icon: '💕', stars: 3 },
  81: { name: '羁绊', color: '#ef4444', colorName: '红色', icon: '❤️‍🔥', stars: 4 }
} as const

export type LevelName = '陌生' | '熟悉' | '亲密' | '羁绊'

/**
 * 根据好感度值获取等级信息
 */
export function getFavorabilityLevel(favorability: number): {
  name: LevelName
  color: string
  icon: string
  stars: number
} {
  if (favorability >= 81) return FAVORABILITY_LEVELS[81]
  if (favorability >= 51) return FAVORABILITY_LEVELS[51]
  if (favorability >= 21) return FAVORABILITY_LEVELS[21]
  return FAVORABILITY_LEVELS[0]
}

/**
 * 用户粘性服务类
 */
export class UserEngagementService {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  /**
   * 获取好感度信息
   */
  async getRelationship(): Promise<RelationshipData> {
    const response = await fetchWithAuth(`${this.baseUrl}/api/auto-chat/relationship`)
    
    if (!response.ok) {
      throw new Error(`获取好感度失败: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.code !== 200) {
      throw new Error(result.message || '获取好感度失败')
    }

    return result.data
  }

  /**
   * 获取日记列表
   */
  async getDiaryList(limit: number = 10): Promise<DiaryEntry[]> {
    const response = await fetchWithAuth(`${this.baseUrl}/api/auto-chat/diary?limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`获取日记列表失败: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.code !== 200) {
      throw new Error(result.message || '获取日记列表失败')
    }

    return result.data
  }

  /**
   * 获取未读日记数量
   */
  async getUnreadDiaryCount(): Promise<number> {
    const response = await fetchWithAuth(`${this.baseUrl}/api/auto-chat/diary/unread-count`)
    
    if (!response.ok) {
      throw new Error(`获取未读日记数量失败: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.code !== 200) {
      throw new Error(result.message || '获取未读日记数量失败')
    }

    return result.data
  }

  /**
   * WebSocket 连接后初始化加载（批量获取未读信息）
   */
  async loadInitialData(): Promise<{
    relationship: RelationshipData | null
    unreadDiaryCount: number
    recentDiaries: DiaryEntry[]
  }> {
    try {
      // 并行请求提高效率
      const [relationship, unreadDiaryCount, recentDiaries] = await Promise.allSettled([
        this.getRelationship(),
        this.getUnreadDiaryCount(),
        this.getDiaryList(10)  // 加载最近10条日记，用于补拉离线期间的日记
      ])

      return {
        relationship: relationship.status === 'fulfilled' ? relationship.value : null,
        unreadDiaryCount: unreadDiaryCount.status === 'fulfilled' ? unreadDiaryCount.value : 0,
        recentDiaries: recentDiaries.status === 'fulfilled' ? recentDiaries.value : []
      }
    } catch (error) {
      console.error('加载初始数据失败:', error)
      return {
        relationship: null,
        unreadDiaryCount: 0,
        recentDiaries: []
      }
    }
  }
}

// 创建单例实例
let userEngagementServiceInstance: UserEngagementService | null = null

/**
 * 获取用户粘性服务实例
 */
export function getUserEngagementService(baseUrl?: string): UserEngagementService {
  if (!userEngagementServiceInstance) {
    userEngagementServiceInstance = new UserEngagementService(baseUrl || getApiBaseUrl())
  }
  return userEngagementServiceInstance
}
