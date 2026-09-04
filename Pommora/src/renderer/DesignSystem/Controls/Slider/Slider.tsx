import { useRef, useState } from 'react'
import { ProgressBar } from '@renderer/DesignSystem/Elements/ProgressBar/ProgressBar'
import { GlassSegment } from '@renderer/DesignSystem/Glass'
import { usePointerGesture } from '@renderer/Interactions/gesture'
import * as s from './slider.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { clamp } from '@shared/clamp'

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
  const begin = usePointerGesture()
  const decimals = decimalsOf(step)
  const v = clamp(draft ?? value, min, max)
  const pct = ((v - min) / (max - min)) * 100
  const valueAt = (clientX: number): number => {
    const r = stripRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return v
    const t = clamp((clientX - r.left) / r.width, 0, 1)
    return Number((Math.round((min + t * (max - min)) / step) * step).toFixed(decimals))
  }
  const scrub = (next: number): void => {
    setDraft(next)
    onInput?.(next)
  }
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
          let last = valueAt(e.clientX)
          const settle = (commit: boolean): void => {
            if (commit && last !== value) onCommit(last)
            else if (!commit) onInput?.(clamp(value, min, max))
            setDraft(null)
          }
          const started = begin({
            el: e.currentTarget,
            event: e,
            activation: 0,
            capture: true,
            swallowActiveEscape: true,
            onActivate: () => true,
            onDragMove: (ev) => {
              last = valueAt(ev.clientX)
              scrub(last)
            },
            onDrop: () => settle(true),
            onTap: () => settle(true),
            onAbort: () => settle(false),
          })
          if (started) scrub(last)
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const next = clamp(
            Number((value + (e.key === 'ArrowRight' ? step : -step)).toFixed(decimals)),
            min,
            max,
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
