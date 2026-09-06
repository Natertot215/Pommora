import { useRef } from 'react'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import {
  GHOST_DWELL_MS,
  useGhostAnchor,
  type GhostAnchor,
} from '@pommora/uix/Interactions/ghostCreate'
import { cx } from '@pommora/uix/Utilities/cx'
import { EditableInput } from '@pommora/uix/Fields/EditableInput'
import { base } from '@pommora/uix/Fields/fields.css'
import * as s from '@pommora/uix/Menus/frames.css'
import { Label } from '@pommora/uix/Labels/Label'
import type { LabelShape } from '@pommora/uix/Labels/label-base.css'

// The slot sits flush under the list it joins, so a leave closes it immediately and landing in the slot keeps it alive either way.
const GHOST_GRACE_MS = 0 // KNOB

/** `busy` latches in a ref: the mechanism re-reads it at the dwell's fire time, long after the render that set it. */
export function useGhostOptionAnchor(busy: boolean): GhostAnchor {
  const busyRef = useRef(busy)
  busyRef.current = busy
  return useGhostAnchor({
    dwellMs: GHOST_DWELL_MS,
    graceMs: GHOST_GRACE_MS,
    suppressed: () => busyRef.current,
  })
}

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

export function ghostAnchorProps(
  api: GhostAnchor,
  anchorId: string,
): { onPointerEnter: () => void; onPointerLeave: () => void } {
  return {
    onPointerEnter: () => api.onHover(anchorId, true),
    onPointerLeave: () => api.onHover(anchorId, false),
  }
}

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
          // Claim the anchor as the create begins — the slot leaves in the same act, so a second click can't open a second naming session.
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
