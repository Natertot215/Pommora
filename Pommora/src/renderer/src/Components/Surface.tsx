import type { ReactNode } from 'react'
import { GlassWindow } from '@renderer/design-system/materials'

// A floating glass overlay on top of the main view, so its backdrop-filter samples the app
// content, never the desktop. Attaches to GlassWindow — the app's largest, backmost glass tier;
// `.surface-glass` is just the sidebar's layout (position + size).
export function Surface({ children }: { children: ReactNode }): React.JSX.Element {
  return <GlassWindow className="surface-glass">{children}</GlassWindow>
}
