import { Icon } from '@renderer/design-system/symbols'

/** The trailing button pair both floating windows carry, left of the pane's ×. The surface's
 *  swallow math sizes itself for exactly this pair, so it stays one component rather than a shape
 *  each window re-declares. */
export function PreviewActions({
  inspectorOpen,
  onToggleInspector,
}: {
  inspectorOpen: boolean
  onToggleInspector: () => void
}): React.JSX.Element {
  return (
    <>
      <button type="button" className="ppane-action" title="Settings">
        <Icon name="sliders-horizontal" size={13} />
      </button>
      <button
        type="button"
        className="ppane-action"
        title="Inspector"
        aria-pressed={inspectorOpen}
        onClick={onToggleInspector}
      >
        <Icon name="panel-right" size={13} />
      </button>
    </>
  )
}
