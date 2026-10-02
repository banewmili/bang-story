import type { ModelOption, VisualProvider } from './types'

/**
 * Google visual models, billed to the same Gemini API key as the story writer and narrator
 * (Google AI Studio, paid tier for video). Nano Banana draws clip images; Omni Flash animates them.
 */

export interface GoogleVisualModel {
  id: string
  name: string
  kind: 'image' | 'video'
  description: string
  /** Rough USD cost: per image, or per second of video at 720p. */
  usdEach: number
  usdPerSec: number | null
}

export const GOOGLE_IMAGE_MODELS: GoogleVisualModel[] = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana',
    kind: 'image',
    description: 'Gambar cepat dan murah, konsisten dengan gambar referensi (maks 3)',
    usdEach: 0.04,
    usdPerSec: null
  }
]

export const GOOGLE_VIDEO_MODELS: GoogleVisualModel[] = [
  {
    id: 'gemini-omni-1.1-flash',
    name: 'Omni Flash',
    kind: 'video',
    description: 'Video 3-10 detik dari gambar klip, dengan audio bawaan',
    usdEach: 0,
    usdPerSec: 0.1
  }
]

export const DEFAULT_GOOGLE_IMAGE_MODEL = 'gemini-2.5-flash-image'
export const DEFAULT_GOOGLE_VIDEO_MODEL = 'gemini-omni-1.1-flash'

export function getGoogleImageModel(id: string | null | undefined): GoogleVisualModel {
  return GOOGLE_IMAGE_MODELS.find((m) => m.id === id) ?? GOOGLE_IMAGE_MODELS[0]
}

export function getGoogleVideoModel(id: string | null | undefined): GoogleVisualModel {
  return GOOGLE_VIDEO_MODELS.find((m) => m.id === id) ?? GOOGLE_VIDEO_MODELS[0]
}

export function isGoogleVisualModel(id: string | null | undefined): boolean {
  return !!id && (GOOGLE_IMAGE_MODELS.some((m) => m.id === id) || GOOGLE_VIDEO_MODELS.some((m) => m.id === id))
}

/** Nano Banana reads up to 3 reference images (character sheets). */
export const GOOGLE_MAX_REFS = 3

/** Omni Flash returns a 3-10 second clip; the editor fits it to the clip like any video. */
export const OMNI_MIN_SEC = 3
export const OMNI_MAX_SEC = 10

export function googleModelOptions(kind: 'image' | 'video'): ModelOption[] {
  const list = kind === 'image' ? GOOGLE_IMAGE_MODELS : GOOGLE_VIDEO_MODELS
  return list.map((m) => ({ id: m.id, name: m.name, family: 'google', description: m.description, tags: [] }))
}

/** USD estimate shown in the pickers, so users can compare with Higgsfield credits. */
export function googleEstimateUsd(kind: 'image' | 'video', modelId: string, seconds = 5): number {
  const m = kind === 'image' ? getGoogleImageModel(modelId) : getGoogleVideoModel(modelId)
  if (m.usdPerSec != null) return m.usdPerSec * Math.min(OMNI_MAX_SEC, Math.max(OMNI_MIN_SEC, Math.ceil(seconds)))
  return m.usdEach
}

export const VISUAL_PROVIDERS: { id: VisualProvider; name: string; description: string }[] = [
  { id: 'higgsfield', name: 'Higgsfield', description: '48 model gambar & video, bayar per kredit' },
  { id: 'google', name: 'Google', description: 'Nano Banana + Omni Flash, tagihan USD via kunci Gemini' }
]
