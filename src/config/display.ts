export interface WindowConfig {
  width: number
  height: number
  minWidth: number
  minHeight: number
  resizable: boolean
  alwaysOnTop: boolean
}

export interface WidgetConfig {
  width: number
  height: number
}

export interface ModelDisplayConfig {
  fillRatio: number
  anchorX: number
  anchorY: number
  positionX: 'center' | 'left' | 'right' | number
  positionY: 'center' | 'top' | 'bottom' | number
  defaultScale?: number
  hideBackground: boolean
}

export interface PerModelDisplayConfig {
  [modelId: string]: Partial<ModelDisplayConfig>
}

export interface DisplayConfig {
  window: WindowConfig
  widget: WidgetConfig
  model: ModelDisplayConfig
  perModel?: PerModelDisplayConfig
}

const defaultDisplayConfig: DisplayConfig = {
  window: {
    width: 400,
    height: 500,
    minWidth: 200,
    minHeight: 300,
    resizable: true,
    alwaysOnTop: true,
  },
  widget: {
    width: 300,
    height: 350,
  },
  model: {
    fillRatio: 0.8,
    anchorX: 0.5,
    anchorY: 0.5,
    positionX: 'center',
    positionY: 'center',
    hideBackground: false,
  },
}

function loadDisplayConfig(): DisplayConfig {
  try {
    const saved = localStorage.getItem('displayConfig')
    if (saved) {
      const parsed = JSON.parse(saved)
      return deepMerge(defaultDisplayConfig, parsed)
    }
  } catch {}
  return { ...defaultDisplayConfig }
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sv = source[key]
    const tv = target[key]
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      result[key] = deepMerge(tv as any, sv as any) as T[keyof T]
    } else if (sv !== undefined) {
      result[key] = sv as T[keyof T]
    }
  }
  return result
}

export function getDisplayConfig(): DisplayConfig {
  return loadDisplayConfig()
}

export function saveDisplayConfig(config: Partial<DisplayConfig>): void {
  const current = loadDisplayConfig()
  const merged = deepMerge(current, config)
  localStorage.setItem('displayConfig', JSON.stringify(merged))
}

export function resetDisplayConfig(): void {
  localStorage.removeItem('displayConfig')
}

export function getModelDisplayConfig(modelId?: string): ModelDisplayConfig {
  const config = loadDisplayConfig()
  if (modelId && config.perModel?.[modelId]) {
    return { ...config.model, ...config.perModel[modelId] }
  }
  return config.model
}

export function setModelDisplayConfig(modelId: string, overrides: Partial<ModelDisplayConfig>): void {
  const config = loadDisplayConfig()
  if (!config.perModel) config.perModel = {}
  config.perModel[modelId] = { ...config.perModel[modelId], ...overrides }
  localStorage.setItem('displayConfig', JSON.stringify(config))
}

export { defaultDisplayConfig }
