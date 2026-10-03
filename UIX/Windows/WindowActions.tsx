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
          icon={sidePaneOpen ? 'panel-right-close' : 'panel-right-open'}
          nearMark
          iconSize="body"
          title="Side Pane"
          pressed={sidePaneOpen}
          showSelection={false}
          onClick={onToggleSidePane}
        />
      )}
    </>
  )
}
