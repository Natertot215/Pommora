import type { CSSProperties, Ref } from 'react'
import { clamp } from '../Utilities/clamp'
import * as s from './progress-bar.css'

const percent = (fill: number): number => clamp(Number.isFinite(fill) ? fill : 0, 0, 1) * 100

export function paintProgress(track: HTMLElement, fill: number): void {
  const pct = percent(fill)
  track.style.setProperty('--fill', String(pct))
  track.setAttribute('aria-valuenow', String(Math.round(pct)))
}

export function ProgressBar({
  fill,
  ref,
}: {
  fill: number
  ref?: Ref<HTMLSpanElement>
}): React.JSX.Element {
  const pct = percent(fill)
  return (
    <span
      ref={ref}
      className={s.track}
      style={{ '--fill': pct } as CSSProperties}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={s.fill} />
    </span>
  )
}
