import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { AssetMap } from '@shared/types'
import type { Crop } from '@shared/schemas'
import { coverStyle } from '@shared/cropGeometry'
import { cropKeyFor } from '@shared/nexusPaths'
import { resolveAssetUrl, resolveAssetValue } from '@renderer/assetUrl'
import { useSession } from '@renderer/store'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useImageAspect } from './imageAspect'
import { fill } from './assetImage.css'

export function cropFor(
  value: string,
  map: AssetMap,
  crops: Record<string, Crop>,
): Crop | undefined {
  const raw = value.trim()
  if (!raw) return undefined
  const resolved = resolveAssetValue(raw, map)
  const key = cropKeyFor(resolved.kind === 'asset' ? resolved.rel : null, raw)
  return key ? crops[key] : undefined
}

interface Props {
  value: string | null | undefined
  className?: string
  style?: CSSProperties
  fallback?: ReactNode
  /** A live crop that overrides the stored one — the editor's draft, painted before it is saved. */
  preview?: Crop
}

/** The one element that draws a stored image. With no crop it is a plain `<img>` and loads no
 *  aspect; with one it paints the `coverStyle` box, observing its own size to pick the fill axis. */
export function AssetImage({ value, className, style, fallback = null, preview }: Props) {
  const map = useSession((s) => s.assetMap)
  const crops = useSession((s) => s.tree?.crops)
  const url = resolveAssetUrl(value, map)
  const crop = preview ?? (value && crops ? cropFor(value, map, crops) : undefined)

  const aspect = useImageAspect(crop && url ? url : undefined)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const obs = useRef<ResizeObserver | null>(null)

  useEffect(() => setFailed(false), [url])

  const observe = useCallback((node: HTMLElement | null) => {
    obs.current?.disconnect()
    obs.current = null
    if (!node) return
    const measure = () => {
      const r = node.getBoundingClientRect()
      setBox({ w: r.width, h: r.height })
    }
    measure()
    obs.current = new ResizeObserver(measure)
    obs.current.observe(node)
  }, [])
  const ref = crop ? observe : undefined

  if (crop && aspect === null) return <>{fallback}</>
  if (crop && aspect && box && box.w > 0 && url) {
    const cover = coverStyle(crop, aspect, box.h / box.w)
    if (cover)
      return (
        <div
          ref={ref}
          className={cx(fill, className)}
          style={{ ...style, backgroundImage: `url("${url}")`, ...cover }}
        />
      )
  }
  if (!url || failed) return <>{fallback}</>
  return (
    <img
      ref={ref}
      className={cx(fill, className)}
      style={style}
      src={url}
      alt=""
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
