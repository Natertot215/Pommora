import { type ButtonHTMLAttributes, forwardRef, Fragment, type ReactNode } from 'react'
import { segment } from '@renderer/DesignSystem/Elements/Segment/segment.css'
import { GlassControls } from '@renderer/DesignSystem/Glass'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { type ButtonSize, type IconSize, vars } from '@renderer/DesignSystem/Tokens'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './button-base.css'

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
  /** Engaged — a toggle that is on, or a trigger whose menu is open. */
  pressed?: boolean
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
    pressed,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const labeled = (label !== undefined && !labelCollapsed) || children !== undefined
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        s.button,
        s.type[type],
        s.size[size],
        inRun && s.inRun,
        labeled && s.labeled,
        outline && s.outlined,
        revealOnHover && s.revealOnHover,
        ghostRest && s.ghostRest,
        labeled && !icon && s.labelOnly,
        pressed && s.pressed,
        className,
      )}
      style={{
        ...(paddingX ? { paddingInline: paddingX } : null),
        ...(icon && iconSize ? { fontSize: vars.size.icon[iconSize] } : null),
        ...style,
      }}
      aria-pressed={pressed}
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
  radius,
}: Look & {
  segments: Segment[]
  glass?: boolean
  labelCollapsed?: boolean
  className?: string
  /** The run pill's own corner, independent of the size's `--btn-radius`. The glass clips to the
   *  element's computed radius, so a CSS value (a var) works for both the glass and the cover. */
  radius?: string
}): React.JSX.Element {
  const buttons = segments.map((seg, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed config array that never reorders
    <Fragment key={i}>
      {i > 0 && <span className={cx(segment, s.dividerBar)} />}
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
  // display/align stay INLINE: the glass layer's <Glass> root sets its own `display: inline-block`
  // inline, which a class can't beat — so the run's flex centering has to be inline too, or the
  // glass buttons lose vertical centering while the cover keeps it.
  const hostProps = {
    className: cx(s.container, s.size[size], className),
    style: { display: 'flex', alignItems: 'center', ...(radius ? { borderRadius: radius } : null) },
  }
  return glass ? (
    <GlassControls {...hostProps}>{buttons}</GlassControls>
  ) : (
    <div {...hostProps}>{buttons}</div>
  )
}
