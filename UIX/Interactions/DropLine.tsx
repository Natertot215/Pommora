import type { CSSProperties, ReactNode } from 'react'
import './drop-chrome.css'

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
