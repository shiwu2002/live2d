import type { Live2DEmotion, Live2DAnimationCommand } from '../types/live2d'

type EmotionMapping = Partial<Record<Live2DEmotion, Live2DAnimationCommand>>

const emotionMap: Record<string, EmotionMapping> = {
  haru: {
    neutral:   { motion: { group: 'Idle', index: 0 } },
    happy:     { motion: { group: 'Tap', index: 0 } },
    angry:     { motion: { group: 'Shake', index: 0 } },
    sad:       { motion: { group: 'Flick', index: 0 } },
    surprised: { motion: { group: 'Tap', index: 1 } },
    shy:       { motion: { group: 'Flick3', index: 0 } },
    thinking:  { motion: { group: 'FlickRight', index: 0 } },
    greeting:  { motion: { group: 'Tap', index: 2 } },
    waving:    { motion: { group: 'FlickLeft', index: 0 } },
  },

  Epsilon: {
    neutral:   { expression: { name: 'Normal' } },
    happy:     { expression: { name: 'Smile' }, motion: { group: 'Tap', index: 0 } },
    angry:     { expression: { name: 'Angry' }, motion: { group: 'Shake', index: 0 } },
    sad:       { expression: { name: 'Sad' }, motion: { group: 'Flick', index: 0 } },
    surprised: { expression: { name: 'Surprised' }, motion: { group: 'FlickUp', index: 0 } },
    shy:       { expression: { name: 'Blushing' }, motion: { group: 'Flick3', index: 0 } },
    thinking:  { expression: { name: 'f01' }, motion: { group: 'FlickDown', index: 0 } },
    greeting:  { expression: { name: 'Smile' }, motion: { group: 'Tap', index: 1 } },
    waving:    { expression: { name: 'Smile' }, motion: { group: 'FlickUp', index: 1 } },
  },

  chitose: {
    neutral:   { expression: { name: 'Normal' } },
    happy:     { expression: { name: 'Smile' }, motion: { group: 'Tap', index: 0 } },
    angry:     { expression: { name: 'Angry' } },
    sad:       { expression: { name: 'Sad' } },
    surprised: { expression: { name: 'Surprised' } },
    shy:       { expression: { name: 'Blushing' } },
    thinking:  { expression: { name: 'f01' }, motion: { group: 'Flick', index: 0 } },
    greeting:  { expression: { name: 'Smile' }, motion: { group: 'Tap', index: 1 } },
    waving:    { expression: { name: 'Smile' }, motion: { group: 'Flick', index: 0 } },
  },

  Gantzert_Felixander: {
    neutral:   { expression: { name: 'Smile' } },
    happy:     { expression: { name: 'Smile' }, motion: { group: 'Tap', index: 0 } },
    angry:     { expression: { name: 'Angry' }, motion: { group: 'FlickUp', index: 0 } },
    sad:       { expression: { name: 'Sad' }, motion: { group: 'Idle', index: 2 } },
    surprised: { expression: { name: 'Surprised' }, motion: { group: 'FlickRight', index: 0 } },
    shy:       { expression: { name: 'Shy' }, motion: { group: 'FlickRight', index: 0 } },
    thinking:  { expression: { name: 'Sad' }, motion: { group: 'Idle', index: 1 } },
    greeting:  { expression: { name: 'Smile' }, motion: { group: 'Greeting', index: 0 } },
    waving:    { expression: { name: 'Smile' }, motion: { group: 'Waving', index: 0 } },
  },

  haru_greeter_pro_jp: {
    neutral:   { motion: { group: 'Idle', index: 0 } },
    happy:     { motion: { group: 'Tap@Head', index: 0 } },
    angry:     { motion: { group: 'Shake', index: 0 } },
    sad:       { motion: { group: 'Flick', index: 0 } },
    surprised: { motion: { group: 'Tap@Head', index: 1 } },
    shy:       { motion: { group: 'Flick3@Head', index: 0 } },
    thinking:  { motion: { group: 'FlickDown@Head', index: 0 } },
    greeting:  { motion: { group: 'Tap', index: 0 } },
    waving:    { motion: { group: 'FlickUp@Head', index: 0 } },
  },

  hiyori_pro_zh: {
    neutral:   { motion: { group: 'Idle', index: 0 } },
    happy:     { motion: { group: 'Tap', index: 0 } },
    angry:     { motion: { group: 'FlickDown', index: 0 } },
    sad:       { motion: { group: 'Flick', index: 0 } },
    surprised: { motion: { group: 'FlickUp', index: 0 } },
    shy:       { motion: { group: 'Tap@Body', index: 0 } },
    thinking:  { motion: { group: 'Idle', index: 1 } },
    greeting:  { motion: { group: 'Tap', index: 1 } },
    waving:    { motion: { group: 'Flick@Body', index: 0 } },
  },

  miku_pro_jp: {
    neutral:   { motion: { group: 'Idle', index: 0 } },
    happy:     { motion: { group: 'Tap', index: 0 } },
    angry:     { motion: { group: 'Flick', index: 0 } },
    sad:       { motion: { group: 'Idle', index: 1 } },
    surprised: { motion: { group: 'FlickUp', index: 0 } },
    shy:       { motion: { group: 'Flick', index: 1 } },
    thinking:  { motion: { group: 'Idle', index: 2 } },
    greeting:  { motion: { group: 'Tap', index: 1 } },
    waving:    { motion: { group: 'Flick', index: 0 } },
  },

  natori_pro_jp: {
    neutral:   { expression: { name: 'Normal' } },
    happy:     { expression: { name: 'Smile' }, motion: { group: 'Tap', index: 0 } },
    angry:     { expression: { name: 'Angry' } },
    sad:       { expression: { name: 'Sad' } },
    surprised: { expression: { name: 'Surprised' }, motion: { group: 'FlickUp@Head', index: 0 } },
    shy:       { expression: { name: 'Blushing' } },
    thinking:  { expression: { name: 'exp_01' }, motion: { group: 'Flick@Body', index: 0 } },
    greeting:  { expression: { name: 'Smile' }, motion: { group: 'Tap@Head', index: 0 } },
    waving:    { expression: { name: 'Smile' }, motion: { group: 'FlickDown@Body', index: 0 } },
  },
}

export function resolveAnimation(
  modelId: string,
  command: Live2DAnimationCommand
): Live2DAnimationCommand | null {
  if (command.emotion) {
    const mapping = emotionMap[modelId]
    if (mapping) {
      const resolved = mapping[command.emotion]
      if (resolved) {
        return resolved
      }
    }
    return resolveFallback(command.emotion)
  }

  if (command.motion || command.expression) {
    return command
  }

  return null
}

function resolveFallback(emotion: Live2DEmotion): Live2DAnimationCommand | null {
  const fallbacks: Record<string, Live2DAnimationCommand> = {
    neutral:   { motion: { group: 'Idle', index: 0 } },
    happy:     { motion: { group: 'Tap', index: 0 } },
    angry:     { motion: { group: 'Shake', index: 0 } },
    sad:       { motion: { group: 'Flick', index: 0 } },
    surprised: { motion: { group: 'Tap', index: 0 } },
    shy:       { motion: { group: 'Flick', index: 0 } },
    thinking:  { motion: { group: 'Idle', index: 0 } },
    greeting:  { motion: { group: 'Tap', index: 0 } },
    waving:    { motion: { group: 'Flick', index: 0 } },
  }
  return fallbacks[emotion] ?? null
}

export function getSupportedEmotions(modelId: string): Live2DEmotion[] {
  const mapping = emotionMap[modelId]
  if (!mapping) return []
  return Object.keys(mapping) as Live2DEmotion[]
}
