// A saved view row's right-click menu, shared by the toolbar's view pane and the view embed — the
// two surfaces that list the same container's views. The titles toggle belongs to the embed's own
// chrome and appears only there; Delete is refused on a container's last view, mirroring the write
// path.

export type ViewRowAction = 'rename' | 'icon' | 'color' | 'titles' | 'delete'

/** What a host can offer for the row that was right-clicked. */
export interface ViewRowMenuContext {
  /** Absent where the host draws no titles; present carries the state the label reads from. */
  titlesShown?: boolean
  deletable: boolean
}

export function viewRowMenuItems(
  ctx: ViewRowMenuContext,
): Array<{
  label: string
  action: ViewRowAction
  separatorBefore?: boolean
  disabled?: boolean
}> {
  return [
    { label: 'Rename', action: 'rename' },
    { label: 'Edit Icon', action: 'icon' },
    { label: 'Edit Color', action: 'color' },
    ...(ctx.titlesShown === undefined
      ? []
      : [{ label: ctx.titlesShown ? 'Hide Titles' : 'Show Titles', action: 'titles' as const }]),
    // Shown and refused rather than absent: a container always has a view, so the row that can't
    // go still says what it is.
    { label: 'Delete', action: 'delete', separatorBefore: true, disabled: !ctx.deletable },
  ]
}
