import { SpaceSettingsContent } from './SpaceSettings'

/**
 * The quick floating form of the Space settings — the toolbar trio's settings button while
 * that Space is the active view. Same content definition as the Settings window; the color
 * icon sits at the pane's bottom-left instead of the footer's right.
 */
export function SpacePanel({ id }: { id: string }): React.JSX.Element | null {
  return <SpaceSettingsContent id={id} colorInFooter={false} />
}
