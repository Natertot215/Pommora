import { useExitPresence } from '@renderer/Animation/useExitPresence'
import { WindowBase } from '@renderer/Windows/window-base'
import { useSession } from '@renderer/store'
import './iteration-window.css'

/** A blank floating surface for previewing a component in isolation, summoned by its chord
 *  (App.tsx). Drop JSX into the body below to see a scoped asset live without wiring it into a real
 *  surface first. */
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
      <div className="iteration-body">{/* drop JSX here to preview it */}</div>
    </WindowBase>
  )
}
