// The New Option slot between two option chips, shared by the flat and the grouped editor. It's
// the property editors' member of the hover-ghost family, riding the same anchor mechanism the
// table's New Page row does — only the thing being created differs.
import { useRef } from 'react'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import {
  GHOST_DWELL_MS,
  useGhostAnchor,
  type GhostAnchor,
} from '@renderer/DesignSystem/Interactions/ghostAnchor'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { base, EditableInput } from '@renderer/DesignSystem/Fields'
import * as s from '../Frames/frames.css'
import { Label, type LabelShape } from '@renderer/DesignSystem/Labels'

// The table's grace: the slot sits flush under the list it joins, so a leave closes it immediately
// and landing in the slot keeps it alive either way.
const GHOST_GRACE_MS = 0 // KNOB

/** One anchor per option list — a Status property has one per group, a Select has the single list.
 *  `busy` stands the slot down while a row is being named or recolored; it latches in a ref since
 *  the mechanism re-reads it at the dwell's fire time, long after the render that set it. */
export function useGhostOptionAnchor(busy: boolean): GhostAnchor {
  const busyRef = useRef(busy)
  busyRef.current = busy
  return useGhostAnchor({
    dwellMs: GHOST_DWELL_MS,
    graceMs: GHOST_GRACE_MS,
    suppressed: () => busyRef.current,
  })
}

/** The inline name caret — an EditableInput carrying the chrome of the thing being named, whether
 *  that's an option's chip or a status group's label. Creating and renaming share this one seat. */
export function OptionNameCaret({
  className,
  value = '',
  onCommit,
  onCancel,
}: {
  className: string
  value?: string
  onCommit: (raw: string) => void
  onCancel: () => void
}): React.JSX.Element {
  return (
    <span className={className}>
      <EditableInput
        value={value}
        autoSize
        className={base}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    </span>
  )
}

/** Spread on the list element that owns `anchorId` — hovering it is what arms the slot. */
export function ghostAnchorProps(
  api: GhostAnchor,
  anchorId: string,
): { onPointerEnter: () => void; onPointerLeave: () => void } {
  return {
    onPointerEnter: () => api.onHover(anchorId, true),
    onPointerLeave: () => api.onHover(anchorId, false),
  }
}

/** Renders nothing until its anchor holds the ghost, and takes no room in the list until then —
 *  the Reveal is what discloses it, so a resting pane is the same height with the slot as without. */
export function GhostOptionChip({
  api,
  anchorId,
  shape,
  onCreate,
}: {
  api: GhostAnchor
  anchorId: string
  shape: LabelShape
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
          // Claim the anchor as the create begins, the way the table's ghost does — the slot leaves
          // in the same act, so a second click can't open a second naming session.
          api.take()
          onCreate()
        }}
      >
        <Label
          shape={shape}
          color="default"
          text="New Option"
          className={cx(s.ghostChip, 'ghost-worn')}
        />
      </button>
    </Reveal>
  )
}
