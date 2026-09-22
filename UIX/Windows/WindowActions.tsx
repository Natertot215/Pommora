import { Button } from '../Buttons/Button'

export function WindowActions({
  showSettings,
  sidePaneOpen,
  onToggleSidePane,
}: {
  showSettings: boolean
  sidePaneOpen: boolean
  onToggleSidePane?: () => void
}): React.JSX.Element {
  return (
    <>
      {showSettings && (
        <Button
          size="button-inline"
          icon="sliders-horizontal"
          iconSize="body"
          title="Settings"
          disabled
        />
      )}
      {onToggleSidePane && (
        <Button
          size="button-inline"
          icon="panel-right"
          iconSize="body"
          title="Side Pane"
          aria-pressed={sidePaneOpen}
          onClick={onToggleSidePane}
        />
      )}
    </>
  )
}
