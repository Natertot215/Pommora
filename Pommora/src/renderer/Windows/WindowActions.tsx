import { Button } from '@renderer/DesignSystem/Buttons'

// The surface's swallow math sizes itself for exactly this pair — stays one component rather than
// a shape each window re-declares.
export function WindowActions({
  inspectorOpen,
  onToggleInspector,
}: {
  inspectorOpen: boolean
  onToggleInspector: () => void
}): React.JSX.Element {
  return (
    <>
      {/* Parked — this toolbar's own settings surface hasn't landed; the ribbon's Settings glyph is the live one. */}
      <Button
        size="button-inline"
        icon="sliders-horizontal"
        iconSize="body"
        title="Settings"
        disabled
      />
      <Button
        size="button-inline"
        icon="panel-right"
        iconSize="body"
        title="Inspector"
        aria-pressed={inspectorOpen}
        onClick={onToggleInspector}
      />
    </>
  )
}
