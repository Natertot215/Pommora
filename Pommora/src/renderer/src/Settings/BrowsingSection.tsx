// The web-session rows: the partition simply remembers whatever the user signs into inside any
// embedded page, so there is nothing to manage — just the one honest wipe-everything.
import { cx } from '@renderer/design-system/cx'
import { text } from '@renderer/design-system/tokens'
import { SettingsRow } from './SettingsRow'

export function BrowsingSection(): React.JSX.Element {
  return (
    <SettingsRow
      label="Clear Browsing Data"
      hint="Wipes every embedded page's storage, signing out of everything."
    >
      <button
        type="button"
        className={cx('settings-action', text.footnote.standard)}
        onClick={() => void window.nexus.clearWebBrowsing()}
      >
        Clear
      </button>
    </SettingsRow>
  )
}
