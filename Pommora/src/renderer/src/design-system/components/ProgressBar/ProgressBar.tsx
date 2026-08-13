import * as s from './progressBar.css'

/** No numeric label, no stroke — the strokeless look is unconfirmed. */
export function ProgressBar({ fill }: { fill: number }): React.JSX.Element {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fill) ? fill : 0)) * 100
  return (
    <div
      className={s.track}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={s.fill} style={{ width: `${pct}%` }} />
    </div>
  )
}
