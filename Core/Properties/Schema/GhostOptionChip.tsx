import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useGhostAnchor, type GhostAnchor } from '@pommora/uix/Interactions/ghostCreate'
import { REVEAL_DWELL_MS } from '@pommora/uix/Interactions/hoverReveal'
import { cx } from '@pommora/uix/Utilities/cx'
import * as s from '@pommora/uix/Menus/frames.css'
import { Label } from '@pommora/uix/Labels/Label'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { useLatest } from '@pommora/uix/Utilities/stableApi'

// The slot sits flush under the list it joins, so a leave closes it immediately and landing in the slot keeps it alive either way.
const GHOST_GRACE_MS = 0 // KNOB

/** `busy` latches in a ref: the mechanism re-reads it at the dwell's fire time, long after the render that set it. */
export function useGhostOptionAnchor(busy: boolean): GhostAnchor {
  const busyRef = useLatest(busy)
  return useGhostAnchor({
    dwellMs: REVEAL_DWELL_MS,
    graceMs: GHOST_GRACE_MS,
    suppressed: () => busyRef.current,
  })
}

export function GhostOptionChip({
  api,
  anchorId,
  type,
  onCreate,
}: {
  api: GhostAnchor
  anchorId: string
  type: string
  onCreate: () => void
}): React.JSX.Element | null {
  const ghost = api.ghost
  if (ghost?.anchorId !== anchorId) return null
  return (
    <Reveal open={!ghost.closing} enterOnMount onCollapsed={api.closed}>
      <button
        type="button"
        data-ghost-root
        className={s.ghostOptionRow}
        onPointerEnter={api.onGhostEnter}
        onPointerLeave={api.onGhostLeave}
        onClick={() => {
          // Claim the anchor as the create begins — the slot leaves in the same act, so a second click can't open a second naming session.
          api.take()
          onCreate()
        }}
      >
        <Label
          shape={optionShapeFor(type)}
          color="default"
          text="New Option"
          className={cx(s.ghostChip, 'ghost-worn')}
        />
      </button>
    </Reveal>
  )
}
