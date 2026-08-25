import { type ButtonHTMLAttributes, forwardRef, Fragment, type ReactNode } from 'react'
import { segment } from '../../../Elements/Segment/segment.css'
import { GlassControls } from '../../../Materials'
import { Icon } from '../../../Symbols'
import { type ButtonSize, type IconSize, vars } from '../../../Tokens'
import { cx } from '../../../Util/cx'
import * as s from './button.css'

export type ButtonType = keyof typeof s.type

type Look = {
  type?: ButtonType
  size?: ButtonSize
  outline?: boolean
  paddingX?: string
  iconSize?: IconSize
}

type ButtonProps = Look & {
  icon?: string
  label?: ReactNode
  labelCollapsed?: boolean
  revealOnHover?: boolean
  ghostRest?: boolean
  /** Inside a Segmented run — the segment geometry rather than the pill's. */
  inRun?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    type = 'base',
    size = 'button-small',
    outline,
    paddingX,
    iconSize,
    icon,
    label,
    labelCollapsed,
    revealOnHover,
    ghostRest,
    inRun,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const g = vars.size.control[size]
  const labeled = label !== undefined || children !== undefined
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        s.button,
        s.type[type],
        outline && s.outlined,
        revealOnHover && s.revealOnHover,
        ghostRest && s.ghostRest,
        labeled && !icon && s.labelOnly,
        className,
      )}
      style={{
        height: inRun ? g.segmentHeight : g.height,
        borderRadius: inRun ? g.segmentRadius : g.radius,
        paddingInline: paddingX ?? (labeled ? g.labelPaddingX : g.paddingX),
        ...(icon ? { fontSize: iconSize ? vars.size.icon[iconSize] : g.icon } : null),
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {icon && label !== undefined ? (
        <span className={cx(s.labelSlot, labelCollapsed && s.labelSlotHidden)}>
          <span className={s.labelText}>{label}</span>
        </span>
      ) : (
        label
      )}
      {children}
    </button>
  )
})

export type Segment = {
  icon?: string
  label?: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  title?: string
}

export function Segmented({
  segments,
  type = 'base',
  size = 'button-large',
  outline,
  paddingX,
  iconSize,
  glass = false,
  labelCollapsed,
  className,
}: Look & {
  segments: Segment[]
  glass?: boolean
  labelCollapsed?: boolean
  className?: string
}): React.JSX.Element {
  const g = vars.size.control[size]
  const containerStyle = {
    height: g.height,
    borderRadius: g.radius,
    display: 'flex',
    alignItems: 'center',
  }
  const buttons = segments.map((seg, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed config array that never reorders
    <Fragment key={i}>
      {i > 0 && <span className={segment} style={{ height: g.dividerHeight }} />}
      <Button
        inRun
        type={type}
        size={size}
        outline={outline}
        paddingX={paddingX}
        iconSize={iconSize}
        icon={seg.icon}
        label={seg.label}
        labelCollapsed={labelCollapsed}
        onClick={seg.onClick}
        disabled={seg.disabled}
        title={seg.title}
        aria-label={seg.title ?? seg.label}
        aria-pressed={seg.active}
      />
    </Fragment>
  ))
  const hostProps = { className: cx(s.container, className), style: containerStyle }
  return glass ? (
    <GlassControls {...hostProps}>{buttons}</GlassControls>
  ) : (
    <div {...hostProps}>{buttons}</div>
  )
}
