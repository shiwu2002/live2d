/**
 * 统一 HTTP 客户端
 * 自动注入认证 token 并检测 401 响应
 */

import { authService } from './authService'

let onUnauthorized: (() => void) | null = null

/**
 * 注册 401 未授权回调（token 失效时触发）
 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

/**
 * 获取认证请求头（仅 Authorization，不含 Content-Type）
 */
export function getAuthHeaders(): Record<string, string> {
  const token = authService.getToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

/**
 * 带认证的 fetch 封装
 * 自动注入 Authorization 头，检测 401 响应
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    onUnauthorized?.()
  }

  return response
}
