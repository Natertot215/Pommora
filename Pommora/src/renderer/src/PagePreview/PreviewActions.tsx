import { Icon } from '@renderer/design-system/symbols'

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
      <button type="button" className="ppane-action" title="Settings" disabled>
        <Icon name="sliders-horizontal" size="body" />
      </button>
      <button
        type="button"
        className="ppane-action"
        title="Inspector"
        aria-pressed={inspectorOpen}
        onClick={onToggleInspector}
      >
        <Icon name="panel-right" size="body" />
      </button>
    </>
  )
}
