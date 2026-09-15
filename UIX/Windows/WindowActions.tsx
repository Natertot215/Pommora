import { Button } from '../Buttons/Button'

// The surface's swallow math sizes itself for exactly this pair.
export function WindowActions({
  sidePaneOpen,
  onToggleSidePane,
}: {
  sidePaneOpen: boolean
  onToggleSidePane: () => void
}): React.JSX.Element {
  return (
    <>
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
        title="Side Pane"
        aria-pressed={sidePaneOpen}
        onClick={onToggleSidePane}
      />
    </>
  )
}
