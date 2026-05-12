export type Live2DEmotion =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'surprised'
  | 'shy'
  | 'thinking'
  | 'greeting'
  | 'waving'

export interface Live2DMotionCommand {
  group: string
  index?: number
}

export interface Live2DExpressionCommand {
  name: string
}

export interface Live2DAnimationCommand {
  emotion?: Live2DEmotion
  motion?: Live2DMotionCommand
  expression?: Live2DExpressionCommand
}

export interface Live2DAnimationInfo {
  motionGroups: string[]
  expressions: string[]
}
