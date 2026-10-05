import { useState } from 'react'
import { ProgressBar } from '../Elements/ProgressBar'
import { GlassControl } from '../Glass/GlassControl'
import { usePointerGesture } from '../Interactions/gesture'
import * as s from './slider.css'
import { cx } from '../Utilities/cx'
import { clamp } from '../Utilities/clamp'

const decimalsOf = (step: number): number => {
  const str = String(step)
  return str.includes('.') ? str.split('.')[1].length : 0
}

/** Drafts locally while dragging: `onInput` per tick, `onCommit` on release and on an arrow-key step. */
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
  const begin = usePointerGesture()
  const decimals = decimalsOf(step)
  const v = clamp(draft ?? value, min, max)
  const pct = ((v - min) / (max - min)) * 100
  const snap = (n: number): number =>
    clamp(Number((min + Math.round((n - min) / step) * step).toFixed(decimals)), min, max)
  const valueAt = (r: DOMRect, clientX: number): number => {
    if (r.width === 0) return v
    return snap(min + clamp((clientX - r.left) / r.width, 0, 1) * (max - min))
  }
  const scrub = (next: number): void => {
    setDraft(next)
    onInput?.(next)
  }
  return (
    <>
      {format && <span className={cx(s.readout, readoutClassName)}>{format(v)}</span>}
      <div
        className={s.strip}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={v}
        tabIndex={0}
        onPointerDown={(e) => {
          const strip = e.currentTarget
          let r = strip.getBoundingClientRect()
          let last = valueAt(r, e.clientX)
          const settle = (commit: boolean): void => {
            if (commit && last !== value) onCommit(last)
            else if (!commit) onInput?.(clamp(value, min, max))
            setDraft(null)
          }
          const started = begin({
            el: strip,
            event: e,
            activation: 0,
            capture: true,
            onDragMove: (ev) => {
              last = valueAt(r, ev.clientX)
              scrub(last)
            },
            onDrop: () => settle(true),
            onTap: () => settle(true),
            onAbort: () => settle(false),
            scrollTarget: () => strip,
            onWindowScroll: () => {
              r = strip.getBoundingClientRect()
            },
          })
          if (started) scrub(last)
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const next = snap(value + (e.key === 'ArrowRight' ? step : -step))
          if (next !== value) onCommit(next)
        }}
      >
        <ProgressBar fill={pct / 100} />
        <div className={s.knob} style={{ left: `${pct}%` }}>
          <GlassControl knob style={{ borderRadius: s.SLIDER_KNOB_RADIUS }}>
            <span className={s.knobFill} />
          </GlassControl>
        </div>
      </div>
    </>
  )
}
