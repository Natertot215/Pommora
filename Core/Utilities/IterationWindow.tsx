import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { WindowBase } from '@pommora/uix/Windows/window-base'
import { useSession } from '../Session/store'

/** A blank floating surface summoned by its chord (App.tsx) for previewing a component in isolation. */
export function IterationWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.iterationOpen)
  const closeIteration = useSession((s) => s.closeIteration)
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return (
    <WindowBase
      id="iteration"
      closing={closing}
      onClose={closeIteration}
      ariaLabel="Iteration"
      title="Iteration"
    >
      <div
        style={{
          flex: '1',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--window-toolbar-h) var(--app-inset) var(--app-inset)',
          overflow: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* drop JSX here to preview it */}
      </div>
    </WindowBase>
  )
}
