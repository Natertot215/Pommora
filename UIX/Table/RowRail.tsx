/** The gutter beside a row's lead cell, drawn as part of the row so a hover arriving straight at its rail slot reveals what sits there; a press, click, or right-click on it reaches nothing. */
export function RowRail(): React.JSX.Element {
  return (
    <span
      className="row-rail"
      aria-hidden="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    />
  )
}
