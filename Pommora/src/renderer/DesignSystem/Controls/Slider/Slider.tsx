import { useEffect, useRef, useState } from 'react'
import { ProgressBar } from '@renderer/DesignSystem/Elements/ProgressBar/ProgressBar'
import { GlassSegment } from '@renderer/DesignSystem/Glass'
import * as s from './slider.css'
import { cx } from '@renderer/DesignSystem/Util/cx'

const decimalsOf = (step: number): number => {
  const str = String(step)
  return str.includes('.') ? str.split('.')[1].length : 0
}

/** Drafts locally while dragging: `onInput` fires per-tick, `onCommit` on release (and on an
 *  arrow-key step) for the persisted write. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  ariaLabel,
  onCommit,
  onInput,
  format,
  readoutClassName,
}: {
  value: number
  min: number
  max: number
  step?: number
  ariaLabel: string
  onCommit: (v: number) => void
  onInput?: (v: number) => void
  format?: (v: number) => string
  readoutClassName?: string
}): React.JSX.Element {
  const [draft, setDraft] = useState<number | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  // Synchronous scrub flag — lostpointercapture fires right after a normal pointerup, and the
  // draft-null guard would only hold as long as React happened to flush first. The unmount cleanup
  // reasserts the committed value so a host closing mid-scrub can't strand a scrubbed preview.
  const scrubbing = useRef(false)
  const revertRef = useRef<() => void>(() => {})
  revertRef.current = () => {
    if (!scrubbing.current) return
    scrubbing.current = false
    onInput?.(clamp(value))
    setDraft(null)
  }
  useEffect(() => () => revertRef.current(), [])
  const decimals = decimalsOf(step)
  const clamp = (v: number): number => Math.max(min, Math.min(max, v))
  const v = clamp(draft ?? value)
  const pct = ((v - min) / (max - min)) * 100
  const valueAt = (clientX: number): number => {
    const r = stripRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return v
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    return Number((Math.round((min + t * (max - min)) / step) * step).toFixed(decimals))
  }
  // A canceled scrub reverts through the same onInput channel before the draft clears. The ref is
  // the guard — synchronous where the draft state waits on a render flush.
  const revertScrub = (): void => revertRef.current()
  return (
    <>
      <div
        ref={stripRef}
        className={s.strip}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={v}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          scrubbing.current = true
          const next = valueAt(e.clientX)
          setDraft(next)
          onInput?.(next)
        }}
        onPointerMove={(e) => {
          if (!scrubbing.current) return
          const next = valueAt(e.clientX)
          setDraft(next)
          onInput?.(next)
        }}
        onPointerUp={() => {
          if (!scrubbing.current) return
          scrubbing.current = false
          if (draft !== null && draft !== value) onCommit(draft)
          setDraft(null)
        }}
        onPointerCancel={revertScrub}
        onLostPointerCapture={revertScrub}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const next = clamp(
            Number((value + (e.key === 'ArrowRight' ? step : -step)).toFixed(decimals)),
          )
          if (next !== value) onCommit(next)
        }}
      >
        <ProgressBar fill={pct / 100} />
        <div className={s.knob} style={{ left: `${pct}%` }}>
          <GlassSegment style={{ borderRadius: 9 }}>
            <span className={s.knobFill} />
          </GlassSegment>
        </div>
      </div>
      {format && <span className={cx(s.readout, readoutClassName)}>{format(v)}</span>}
    </>
  )
}
