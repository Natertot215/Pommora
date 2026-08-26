import type { ReactNode } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import type { DragItem } from '@renderer/DesignSystem/Interactions/drag'
import { NavTrail, type TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import './cards.css'

export const cardTitleType = text.body.emphasized

type DivProps = React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }

/** The card's root — the drag shell. The engine owns this element's inline transform, so the frame
 *  and hover-pop live on the body inside. `locked` holds the 125/90 aspect (thumb as a share of the
 *  card); the default reflows — fixed thumb, content-grown text. */
export function CardRoot({
  drag,
  active,
  locked,
  dragging = drag?.isDragging,
  className,
  children,
  ...rest
}: DivProps & {
  drag?: DragItem | null
  active?: boolean
  locked?: boolean
  dragging?: boolean
}): React.JSX.Element {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a real <button> cannot host this surface — it doubles as a drag handle and wraps block content
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      role="button"
      tabIndex={0}
      {...(drag?.handle ?? {})}
      {...rest}
      className={cx(
        'card',
        locked && 'is-locked',
        active && 'is-active',
        dragging && 'is-dragging',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The visual card: the bordered, clipped frame. Pops on hover unless the caller says otherwise (a
 *  ghost or a drag overlay never pops). */
export function CardBody({
  pop = true,
  className,
  ...rest
}: DivProps & { pop?: boolean }): React.JSX.Element {
  return <div {...rest} className={cx('card-body', pop && 'hover-pop', className)} />
}

/** The image band. `capture` marks a captured page preview, which the shared preview zoom applies to. */
export function CardThumb({
  capture,
  className,
  ...rest
}: DivProps & { capture?: boolean }): React.JSX.Element {
  return <div {...rest} className={cx('card-thumb', capture && 'is-capture', className)} />
}

export function CardPlaceholder({ children }: { children: ReactNode }): React.JSX.Element {
  return <span className="card-ph">{children}</span>
}

export function CardText(props: DivProps): React.JSX.Element {
  return <div {...props} className={cx('card-text', props.className)} />
}

/** The title row: a truncating scroll box by default, a wrapping run, or a static row for a
 *  caller that mounts its own field inside. */
export function CardTitle({
  mode = 'scroll',
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  mode?: 'scroll' | 'wrap' | 'static'
}): React.JSX.Element {
  const cls = cx('card-title', mode === 'wrap' && 'is-wrap', cardTitleType, className)
  if (mode === 'scroll') return <OverScroll className={cls}>{children}</OverScroll>
  return (
    <span {...rest} className={cls}>
      {children}
    </span>
  )
}

export function CardTrail({
  segments,
  className,
}: {
  segments: TrailSegment[]
  className?: string
}): React.JSX.Element | null {
  return (
    <NavTrail segments={segments} className={cx('card-loc', text.caption.standard, className)} />
  )
}
