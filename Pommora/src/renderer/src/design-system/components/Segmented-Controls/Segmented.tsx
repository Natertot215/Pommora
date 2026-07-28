import { Fragment } from 'react'
import { GlassControls } from '../../materials'
import { Icon } from '../../symbols'
import { vars, type ButtonSize, type IconSize } from '../../tokens'
import * as s from './segmented.css'

/** `active` never draws a fill (no active-state style, by design) — it only sets `aria-pressed`. */
export type Segment = {
  icon: string
  label?: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  title?: string
}

type SegmentedProps = {
  segments: Segment[]
  size?: ButtonSize
  paddingX?: string
  iconSize?: IconSize
  className?: string
  glass?: boolean
  /** Stays mounted and slides back on toggle (a CSS width collapse), not unmounted. */
  labelCollapsed?: boolean
}

function Segmented({
  segments,
  size = 'button-large',
  paddingX,
  iconSize,
  withLabel,
  labelCollapsed,
  className,
  glass = true,
}: SegmentedProps & { withLabel: boolean }): React.JSX.Element {
  const g = vars.size.control[size]
  const segmented = segments.length > 1
  const containerClass = className ? `${s.container} ${className}` : s.container
  const containerStyle = {
    height: g.height,
    borderRadius: g.radius,
    display: 'flex',
    alignItems: 'center',
  }
  const buttons = (
    <>
      {segments.map((seg, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed config array that never reorders
        <Fragment key={`${i}-${seg.icon}`}>
          {i > 0 && <span className={s.divider} style={{ height: g.dividerHeight }} />}
          <button
            type="button"
            className={s.segment}
            style={{
              height: g.segmentHeight,
              borderRadius: segmented ? g.segmentRadius : g.radius,
              paddingInline: paddingX ?? g.paddingX,
              fontSize: iconSize ? vars.size.icon[iconSize] : g.icon,
            }}
            onClick={seg.onClick}
            disabled={seg.disabled}
            title={seg.title}
            aria-label={seg.title ?? seg.label}
            aria-pressed={seg.active}
          >
            <Icon name={seg.icon} />
            {withLabel && seg.label && (
              <span
                className={labelCollapsed ? `${s.labelSlot} ${s.labelSlotHidden}` : s.labelSlot}
              >
                <span className={s.labelText}>{seg.label}</span>
              </span>
            )}
          </button>
        </Fragment>
      ))}
    </>
  )
  return glass ? (
    <GlassControls className={containerClass} style={containerStyle}>
      {buttons}
    </GlassControls>
  ) : (
    <div className={containerClass} style={containerStyle}>
      {buttons}
    </div>
  )
}

/** Figma SEGMENTED · SYMBOL. */
export function SegmentedSymbol(props: SegmentedProps): React.JSX.Element {
  return <Segmented {...props} withLabel={false} />
}

/** Figma SEGMENTED · BUTTON — same core. */
export function SegmentedButton(props: SegmentedProps): React.JSX.Element {
  return <Segmented {...props} withLabel />
}
