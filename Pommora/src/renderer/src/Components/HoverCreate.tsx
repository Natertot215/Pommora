import { cx } from '@renderer/design-system/cx'

/** The hover-revealed "+" create affordance: absolutely positioned inside its container,
 *  invisible at rest, revealed by the container's :hover (the `.section-add` recipe). No-drag
 *  so it stays clickable inside a draggable glass surface; placement comes from the mount's
 *  own class via `className`. */
export function HoverCreate({
  label,
  className,
  onClick,
}: {
  label: string
  className?: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cx('hover-create', className)}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      +
    </button>
  )
}
