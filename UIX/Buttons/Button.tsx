import { type ButtonHTMLAttributes, Fragment, type ReactNode, type Ref, useRef } from 'react'
import { segment } from '../Elements/segment.css'
import { GlassControl } from '../Glass/GlassControl'
import { revealTarget } from '../Interactions/hover-reveal.css'
import { type Reach, useRevealWithin } from '../Interactions/hoverReveal'
import { Icon } from '../Symbols'
import { type ButtonSize, type IconSize, size as sizeTokens } from '../Theme/theme-vars.css'
import { cx } from '../Utilities/cx'
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
  /** The icon's last mark — an arrow, say — shows only while the pointer is within reach. */
  nearMark?: boolean
  label?: ReactNode
  labelCollapsed?: boolean
  reveal?: boolean
  inRun?: boolean
  pressed?: boolean
  showSelection?: boolean
  cursor?: 'pointer'
  ref?: Ref<HTMLButtonElement>
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'>

/** The classes a button wears, so a control drawn outside React wears exactly what `Button` does. */
export function buttonClass({
  type = 'base',
  size = 'button-small',
  inRun,
  labeled,
  outline,
  reveal,
  labelOnly,
  pressed,
  pointer,
}: {
  type?: ButtonType
  size?: ButtonSize
  inRun?: boolean
  labeled?: boolean
  outline?: boolean
  reveal?: boolean
  labelOnly?: boolean
  pressed?: boolean
  pointer?: boolean
}): string {
  return cx(
    s.button,
    s.type[type],
    s.size[size],
    inRun && s.inRun,
    labeled && s.labeled,
    outline && s.outlined,
    reveal && revealTarget,
    labelOnly && s.labelOnly,
    pressed && s.pressed,
    pointer && s.pointer,
  )
}

/** The divider a Segmented run stands between its buttons. */
export const segmentDivider = cx(segment, s.dividerBar)

export function Button({
  type = 'base',
  size = 'button-small',
  outline,
  paddingX,
  iconSize,
  icon,
  nearMark,
  label,
  labelCollapsed,
  reveal,
  inRun,
  pressed,
  showSelection = true,
  cursor,
  className,
  style,
  children,
  ref,
  ...rest
}: ButtonProps): React.JSX.Element {
  const labeled = (label !== undefined && !labelCollapsed) || children !== undefined
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        buttonClass({
          type,
          size,
          inRun,
          labeled,
          outline,
          reveal,
          labelOnly: labeled && !icon,
          pressed: pressed && showSelection,
          pointer: cursor === 'pointer',
        }),
        className,
      )}
      style={{
        ...(paddingX ? { paddingInline: paddingX } : null),
        ...(icon && iconSize ? { fontSize: sizeTokens.icon[iconSize] } : null),
        ...style,
      }}
      aria-pressed={pressed}
      {...rest}
    >
      {icon && (nearMark ? <NearGlyph icon={icon} /> : <Icon name={icon} />)}
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
}

const NEAR: Reach = { size: 'inline' }

function NearGlyph({ icon }: { icon: string }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  useRevealWithin(ref, NEAR)
  return (
    <span ref={ref} className={s.nearMark} data-reveal-host="off">
      <Icon name={icon} />
    </span>
  )
}

export type Segment = {
  icon?: string
  nearMark?: boolean
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
  trailingDivider,
  showSelection,
  className,
  radius,
}: Look & {
  segments: Segment[]
  showSelection?: boolean
  glass?: boolean
  labelCollapsed?: boolean
  trailingDivider?: boolean
  className?: string
  /** The glass clips to the element's computed radius, so a CSS value (a var) works for both the glass and the cover. */
  radius?: string
}): React.JSX.Element {
  const divider = <span className={segmentDivider} />
  const buttons = segments.map((seg, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed config array that never reorders
    <Fragment key={i}>
      {i > 0 && divider}
      <Button
        inRun
        type={type}
        size={size}
        outline={outline}
        paddingX={paddingX}
        iconSize={iconSize}
        icon={seg.icon}
        nearMark={seg.nearMark}
        label={seg.label}
        labelCollapsed={labelCollapsed}
        onClick={seg.onClick}
        disabled={seg.disabled}
        title={seg.title}
        aria-label={seg.title ?? seg.label}
        pressed={seg.active}
        showSelection={showSelection}
      />
    </Fragment>
  ))
  if (trailingDivider) buttons.push(<Fragment key={segments.length}>{divider}</Fragment>)
  // display/align stay INLINE: <Glass>'s root sets `display: inline-block` inline, which a class can't beat.
  const hostProps = {
    className: cx(s.container, s.size[size], className),
    style: { display: 'flex', alignItems: 'center', ...(radius ? { borderRadius: radius } : null) },
  }
  return glass ? (
    <GlassControl {...hostProps}>{buttons}</GlassControl>
  ) : (
    <div {...hostProps}>{buttons}</div>
  )
}
