import type { CSSProperties, ReactNode } from 'react'
import './drop-chrome.css'

/** The insertion line every drop-line surface renders inside its `drop-line-host`: the accent bar
 *  and the leading dot that always rides it. The classes carry the edge insets; a surface passes
 *  only the geometry it genuinely owns (its `top`, a depth-indented `left`, a column-scoped
 *  `width`) through `style`. */
export function DropLine({
  style,
  className,
}: {
  style: CSSProperties
  className?: string
}): ReactNode {
  return (
    <div className={className ? `drop-line ${className}` : 'drop-line'} aria-hidden style={style}>
      <span className="drop-dot" />
    </div>
  )
}
