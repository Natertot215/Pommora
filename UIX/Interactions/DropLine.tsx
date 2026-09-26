import type { CSSProperties, ReactNode } from 'react'
import './drop-chrome.css'

export function DropLine({ style }: { style: CSSProperties }): ReactNode {
  return (
    <div className="drop-line" aria-hidden style={style}>
      <span className="drop-dot" />
    </div>
  )
}
