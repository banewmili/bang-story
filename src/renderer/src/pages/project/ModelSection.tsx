import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Film, Image as ImageIcon, Move, Users } from 'lucide-react'
import {
  DEFAULT_GOOGLE_IMAGE_MODEL,
  DEFAULT_GOOGLE_VIDEO_MODEL,
  VISUAL_PROVIDERS,
  getGoogleImageModel,
  getGoogleVideoModel,
  googleModelOptions
} from '@shared/google'
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  effectiveResolution,
  fitDuration,
  getImageModel,
  getVideoModel,
  hfModelOptions,
  maxRefs,
  resolutionOptions
} from '@shared/higgsfield'
import type { CreditEstimate, ModelOption, Project, VisualProvider } from '@shared/types'
import { ModelLogo } from '../../components/ModelLogo'
import { ModelPicker } from '../../components/ModelPicker'
import { Segmented, Spinner } from '../../components/ui'
import { creditLabel, usdLabel } from '../../lib/format'
import { useEstimate, useEstimates } from '../../lib/useEstimate'

const HF_IMAGE_OPTIONS = hfModelOptions('image')
const HF_VIDEO_OPTIONS = hfModelOptions('video')
const GOOGLE_IMAGE_OPTIONS = googleModelOptions('image')
const GOOGLE_VIDEO_OPTIONS = googleModelOptions('video')

/** Adds each model's estimated cost to its picker row once the right key is known to exist. */
function withCosts(
  options: ModelOption[],
  costs: Record<string, CreditEstimate | null>,
  unit: (id: string) => string,
  on: boolean,
  usdOnly = false
): ModelOption[] {
  if (!on) return options
  return options.map((o) =>
    usdOnly
      ? { ...o, usd: o.id in costs ? (costs[o.id]?.usd ?? null) : undefined, usdOnly: true }
      : {
          ...o,
          credits: o.id in costs ? (costs[o.id]?.credits ?? null) : undefined,
          usd: costs[o.id]?.usd ?? null,
          creditUnit: unit(o.id)
        }
  )
}

function Cost({
  value,
  hasKey,
  keyLabel,
  children
}: {
  value: CreditEstimate | null | undefined
  hasKey: boolean | null
  keyLabel: string
  children: (estimate: CreditEstimate) => ReactNode
}) {
  if (hasKey === false) return <span className="text-muted">Perkiraan biaya muncul setelah kunci {keyLabel} diisi di Pengaturan.</span>
  if (value === undefined)
    return (
      <span className="flex items-center gap-1.5 text-muted">
        <Spinner className="size-3" />
        Menghitung biaya…
      </span>
    )
  if (value === null) return <span className="text-muted">Perkiraan biaya belum tersedia.</span>
  return <span>{children(value)}</span>
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line-2 bg-surface p-3">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        {icon}
        {title}
      </span>
      {children}
    </div>
  )
}

/** Which provider draws and animates this project's clips, and with which models. */
export function ModelSection({
  project,
  clipCount,
  perClip,
  onChange
}: {
  project: Project
  clipCount: number
  perClip: number
  onChange: (patch: { visualProvider?: VisualProvider; imageModel?: string; videoModel?: string; videoResolution?: string | null }) => void
}) {
  const provider: VisualProvider = project.visualProvider ?? 'higgsfield'
  const isGoogle = provider === 'google'
  const keyProvider = isGoogle ? 'gemini' : 'higgsfield'
  const keyLabel = isGoogle ? 'Gemini' : 'Higgsfield'

  const setProvider = (v: VisualProvider): void => {
    if (v === provider) return
    onChange({
      visualProvider: v,
      imageModel: v === 'google' ? DEFAULT_GOOGLE_IMAGE_MODEL : DEFAULT_IMAGE_MODEL,
      videoModel: v === 'google' ? DEFAULT_GOOGLE_VIDEO_MODEL : DEFAULT_VIDEO_MODEL,
      videoResolution: null
    })
  }

  const IMAGE_OPTIONS = isGoogle ? GOOGLE_IMAGE_OPTIONS : HF_IMAGE_OPTIONS
  const VIDEO_OPTIONS = isGoogle ? GOOGLE_VIDEO_OPTIONS : HF_VIDEO_OPTIONS
  const IMAGE_IDS = IMAGE_OPTIONS.map((o) => o.id)
  const VIDEO_IDS = VIDEO_OPTIONS.map((o) => o.id)

  const imageId = isGoogle ? getGoogleImageModel(project.imageModel).id : getImageModel(project.imageModel).id
  const videoId = isGoogle ? getGoogleVideoModel(project.videoModel).id : getVideoModel(project.videoModel).id
  const seconds = isGoogle ? perClip : (fitDuration(getVideoModel(videoId), perClip) ?? perClip)
  const imageCost = useEstimate('image', imageId, project.aspectRatio)
  const resolutions = isGoogle ? [] : resolutionOptions(getVideoModel(videoId))
  const resolution = isGoogle ? null : effectiveResolution(getVideoModel(videoId), project.videoResolution)
  const videoCost = useEstimate('video', videoId, project.aspectRatio, perClip, resolution)
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  useEffect(() => {
    void window.api.settings.keys().then((keys) => setHasKey(!!keys.find((k) => k.provider === keyProvider)?.configured))
  }, [keyProvider])

  const imageCosts = useEstimates('image', IMAGE_IDS, project.aspectRatio, undefined, hasKey === true)
  const videoCosts = useEstimates('video', VIDEO_IDS, project.aspectRatio, perClip, hasKey === true)
  const imageModels = useMemo(
    () => withCosts(IMAGE_OPTIONS, imageCosts, () => '', hasKey === true, isGoogle),
    [IMAGE_OPTIONS, imageCosts, hasKey, isGoogle]
  )
  const videoModels = useMemo(
    () =>
      withCosts(
        VIDEO_OPTIONS,
        videoCosts,
        (id) => (isGoogle ? `${Math.min(10, Math.max(3, Math.ceil(perClip)))} dtk` : `${fitDuration(getVideoModel(id), perClip)} dtk`),
        hasKey === true,
        isGoogle
      ),
    [VIDEO_OPTIONS, videoCosts, perClip, isGoogle]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">Model AI</span>
          <span className="text-[13px] text-muted">
            {isGoogle ? 'Nano Banana & Omni Flash dari Google' : `${HF_IMAGE_OPTIONS.length} model gambar dan ${HF_VIDEO_OPTIONS.length} model video dari Higgsfield`}
          </span>
        </div>
        <Segmented
          size="sm"
          value={provider}
          onChange={(v) => setProvider(v as VisualProvider)}
          options={VISUAL_PROVIDERS.map((p) => ({ id: p.id, label: p.name, title: p.description }))}
        />
      </div>
      {isGoogle && (
        <p className="-mt-1 text-[12.5px] leading-snug text-muted">
          Ditagih dalam USD ke kunci Gemini yang sama dengan penyusun cerita. Video Omni Flash butuh paid tier di Google AI Studio.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Card icon={<ImageIcon className="size-4" />} title="Gambar klip">
          <ModelPicker
            value={imageId}
            models={imageModels}
            footerNote={hasKey ? (isGoogle ? 'USD per gambar, tarif publik Google' : 'kredit per gambar, perkiraan Higgsfield untuk akunmu') : undefined}
            renderIcon={(m) => <ModelLogo family={m.family} />}
            detail="description"
            tagFilters={isGoogle ? [] : ['Rekomendasi', 'Referensi', 'GPT Image', 'Soul', 'Recraft', '4K']}
            menuClassName="w-[430px]"
            onChange={(id) => onChange({ imageModel: id })}
          />
          <p className="text-[12.5px] leading-snug text-ink-2">
            <Cost value={imageCost} hasKey={hasKey} keyLabel={keyLabel}>
              {(c) =>
                isGoogle && c.usd != null ? (
                  <>
                    ≈ {usdLabel(c.usd)} per gambar · {clipCount} gambar ≈ <b className="font-semibold text-ink">{usdLabel(c.usd * clipCount)}</b>
                  </>
                ) : (
                  <>
                    ≈ {creditLabel(c.credits)} kredit per gambar · {clipCount} gambar ≈{' '}
                    <b className="font-semibold text-ink">{creditLabel(c.credits * clipCount)} kredit</b>
                  </>
                )
              }
            </Cost>
          </p>
          <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Users className="mt-px size-3.5 shrink-0" />
            {isGoogle
              ? 'Pakai lembar karakter (maks 3) sebagai referensi, jadi wajah tokoh tetap sama di tiap klip.'
              : maxRefs(getImageModel(imageId))
                ? 'Pakai lembar karakter, jadi wajah dan kostum tokoh tetap sama di tiap klip.'
                : 'Tanpa lembar karakter, jadi tampilan tokoh bisa sedikit berubah antar klip.'}
          </p>
        </Card>
        <Card icon={<Film className="size-4" />} title="Video AI">
          <ModelPicker
            value={videoId}
            models={videoModels}
            footerNote={hasKey ? (isGoogle ? `USD per video untuk klip ±${Math.ceil(perClip)} detik` : `kredit per video untuk klip ±${perClip} detik`) : undefined}
            renderIcon={(m) => <ModelLogo family={m.family} />}
            detail="description"
            tagFilters={isGoogle ? [] : ['Rekomendasi', 'Kling', 'Seedance', 'Wan', 'Referensi', '4K']}
            align="right"
            menuClassName="w-[430px]"
            onChange={(id) => onChange({ videoModel: id })}
          />
          {!isGoogle &&
            (resolutions.length > 1 ? (
              <div className="flex items-center gap-2.5">
                <span className="shrink-0 text-[12.5px] font-medium text-ink-2">Resolusi</span>
                <Segmented
                  size="sm"
                  value={resolution ?? resolutions[0]}
                  onChange={(v) => onChange({ videoResolution: v })}
                  options={resolutions.map((r) => ({ id: r, label: r.toUpperCase() === '4K' || r.toUpperCase() === '2K' ? r.toUpperCase() : r }))}
                  className="min-w-0 flex-1"
                />
              </div>
            ) : (
              resolution && <p className="text-[12.5px] text-ink-2">Resolusi {resolution} (satu-satunya pilihan model ini)</p>
            ))}
          <p className="text-[12.5px] leading-snug text-ink-2">
            <Cost value={videoCost} hasKey={hasKey} keyLabel={keyLabel}>
              {(c) =>
                isGoogle && c.usd != null ? (
                  <>
                    ≈ {usdLabel(c.usd)} per video {Math.ceil(seconds)} detik
                  </>
                ) : (
                  <>
                    ≈ {creditLabel(c.credits)} kredit per video {seconds} detik{resolution ? `, ${resolution}` : ''}
                  </>
                )
              }
            </Cost>
          </p>
          <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-muted">
            <Move className="mt-px size-3.5 shrink-0" />
            Hanya untuk klip yang kamu jadikan Video AI. Gerak kamera tetap gratis.
          </p>
        </Card>
      </div>
    </div>
  )
}
