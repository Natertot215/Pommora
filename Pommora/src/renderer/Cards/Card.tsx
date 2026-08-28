import type { ReactNode } from 'react'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { OverScroll } from '@renderer/DesignSystem/Interactions/OverScroll'
import type { DragItem } from '@renderer/DesignSystem/Interactions/drag'
import { NavTrail, type TrailSegment } from '@renderer/DesignSystem/Elements/NavTrail'
import './cards.css'

const cardTitleType = text.body.emphasized

type DivProps = React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }

/** The engine owns this element's inline transform, so frame and hover-pop live on the body inside instead. */
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

export function CardBody({
  pop = true,
  className,
  ...rest
}: DivProps & { pop?: boolean }): React.JSX.Element {
  return <div {...rest} className={cx('card-body', pop && 'hover-pop', className)} />
}

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

export function CardTrail({ segments }: { segments: TrailSegment[] }): React.JSX.Element | null {
  return <NavTrail segments={segments} className="card-loc" />
}
