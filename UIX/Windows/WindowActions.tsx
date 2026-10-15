import { Button } from '../Buttons/Button'

export function WindowActions({
  sidePaneOpen,
  onMenu,
  onToggleSidePane,
}: {
  sidePaneOpen: boolean
  onMenu?: () => void
  onToggleSidePane?: () => void
}): React.JSX.Element {
  return (
    <>
      {onMenu && (
        <Button
          size="button-inline"
          icon="sliders-horizontal"
          iconSize="body"
          title="Settings"
          onClick={onMenu}
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
