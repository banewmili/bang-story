import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'
import { requireSecret } from '../secrets'
import { sleep } from './http'

/**
 * Google visual models on the Gemini API key: Nano Banana draws images,
 * Omni Flash animates them into short videos (Interactions API).
 */

const IMAGE_MODEL = 'gemini-2.5-flash-image'
const VIDEO_MODEL = 'gemini-omni-1.1-flash'

/** Narration and music come from the editor, so generated clips stay silent like the Higgsfield ones. */
const SILENT = 'Silent clip: no background music, no soundtrack, no singing or humming, no dialogue.'

function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireSecret('gemini') })
}

function friendly(e: unknown): Error {
  const msg = (e as Error)?.message ?? String(e)
  if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(msg))
    return new Error('Kunci Gemini ditolak. Periksa kunci di Pengaturan.')
  if (/RESOURCE_EXHAUSTED|429/i.test(msg)) return new Error('Kuota Gemini habis atau terlalu banyak permintaan. Coba lagi sebentar.')
  if (/not found|404/i.test(msg)) return new Error(`Model Google tidak tersedia untuk kunci ini: ${msg}`)
  if (/billed|billing|paid tier/i.test(msg))
    return new Error('Video Omni Flash butuh penagihan aktif di proyek Google AI Studio (paid tier).')
  return new Error(`Google gagal: ${msg}`)
}

function mimeOf(absPath: string): string {
  const ext = extname(absPath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

/** First image part in a generateContent response. */
function firstImageBytes(res: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }> }): Buffer | null {
  for (const c of res.candidates ?? []) {
    for (const p of c.content?.parts ?? []) {
      const d = p.inlineData
      if (d?.data && (d.mimeType ?? '').startsWith('image/')) return Buffer.from(d.data, 'base64')
    }
  }
  return null
}

/**
 * Draws one image with Nano Banana. Reference images (character sheets) keep
 * the cast consistent; up to three are sent.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  refAbsPaths: string[],
  signal?: AbortSignal
): Promise<Buffer> {
  try {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }]
    for (const abs of refAbsPaths.slice(0, 3)) {
      parts.push({ inlineData: { mimeType: mimeOf(abs), data: readFileSync(abs).toString('base64') } })
    }
    const res = await client().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts }] as never,
      config: {
        abortSignal: signal,
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio }
      } as never
    })
    const bytes = firstImageBytes(res as never)
    if (!bytes) throw new Error('Nano Banana tidak mengirim gambar')
    return bytes
  } catch (e) {
    if (signal?.aborted) throw new Error('Dibatalkan')
    throw friendly(e)
  }
}

interface VideoFound {
  bytes?: Buffer
  fileUri?: string
}

/** Walks an Interactions API response for a generated video: inline bytes or a file URI. */
function findVideo(node: unknown): VideoFound | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const v of node) {
      const hit = findVideo(v)
      if (hit) return hit
    }
    return null
  }
  const o = node as Record<string, unknown>
  const inline = o.inlineData as { mimeType?: string; data?: string } | undefined
  if (inline?.data && (inline.mimeType ?? '').startsWith('video/')) return { bytes: Buffer.from(inline.data, 'base64') }
  const file = o.fileData as { fileUri?: string; file_uri?: string } | undefined
  const uri = file?.fileUri ?? file?.file_uri
  if (uri && typeof uri === 'string') return { fileUri: uri }
  for (const v of Object.values(o)) {
    const hit = findVideo(v)
    if (hit) return hit
  }
  return null
}

async function downloadVideoFile(uri: string, signal?: AbortSignal): Promise<Buffer> {
  const key = requireSecret('gemini')
  const url = uri.includes('key=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Unduhan video gagal (HTTP ${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Animates the clip's image with Omni Flash (image-to-video). Returns the MP4 bytes.
 * The Interactions API usually answers in one call; when it stays queued, it is polled.
 */
export async function generateVideo(
  prompt: string,
  firstFrameAbsPath: string,
  onStatus: (message: string) => void,
  signal?: AbortSignal
): Promise<Buffer> {
  const key = requireSecret('gemini')
  const ai = new GoogleGenAI({ apiKey: key })
  const fullPrompt = `${prompt.trim()} ${SILENT}`
  try {
    onStatus('Mengirim ke Omni Flash')
    let interaction = (await ai.interactions.create({
      model: VIDEO_MODEL,
      input: {
        role: 'user',
        parts: [{ text: fullPrompt }, { inlineData: { mimeType: mimeOf(firstFrameAbsPath), data: readFileSync(firstFrameAbsPath).toString('base64') } }]
      } as never,
      generation_config: { video_config: { task: 'image_to_video' } }
    } as never)) as unknown as { id: string; status?: string; steps?: unknown }
    const started = Date.now()
    while (interaction.status === 'queued' || interaction.status === 'in_progress') {
      if (signal?.aborted) {
        await ai.interactions.cancel(interaction.id).catch(() => undefined)
        throw new Error('Dibatalkan')
      }
      if (Date.now() - started > 10 * 60 * 1000) {
        await ai.interactions.cancel(interaction.id).catch(() => undefined)
        throw new Error('Omni Flash terlalu lama. Coba lagi.')
      }
      onStatus('Membuat video')
      await sleep(5000, signal)
      interaction = (await ai.interactions.get(interaction.id)) as unknown as typeof interaction
    }
    if (interaction.status === 'failed' || interaction.status === 'cancelled') throw new Error(`Omni Flash gagal (${interaction.status})`)
    const found = findVideo(interaction)
    if (found?.bytes) return found.bytes
    if (found?.fileUri) {
      onStatus('Mengunduh video')
      return downloadVideoFile(found.fileUri, signal)
    }
    throw new Error('Omni Flash selesai tanpa file video')
  } catch (e) {
    if (signal?.aborted) throw new Error('Dibatalkan')
    throw friendly(e)
  }
}

/** A key that can list models; video additionally needs an active billing project (paid tier). */
export async function testVisualKey(): Promise<{ ok: boolean; message: string }> {
  try {
    const pager = await client().models.list({ config: { pageSize: 10 } })
    await pager.page
    return { ok: true, message: 'Kunci Gemini valid. Nano Banana siap; video Omni Flash butuh paid tier.' }
  } catch (e) {
    return { ok: false, message: friendly(e).message }
  }
}
