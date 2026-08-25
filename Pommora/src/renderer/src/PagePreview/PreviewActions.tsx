import { Button } from '@renderer/DesignSystem/Components/Controls/Button'

// The surface's swallow math sizes itself for exactly this pair — stays one component rather than
// a shape each window re-declares.
export function PreviewActions({
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
        className="ppane-action"
        title="Settings"
        disabled
      />
      <Button
        size="button-inline"
        icon="panel-right"
        iconSize="body"
        className="ppane-action"
        title="Inspector"
        aria-pressed={inspectorOpen}
        onClick={onToggleInspector}
      />
    </>
  )
}
