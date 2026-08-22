import { PathField } from '@renderer/design-system/components/PathField'
import * as s from './settingsPane.css'

/** Where this property's uploads land — the asset directory itself by default, or a subfolder
 *  beneath it. Def-level (property-wide), like a link's color or a number's format. The path is
 *  relative to the asset root rather than to the nexus, so re-pointing the root carries it along.
 *
 *  It wears the house path field, the same control the Default Asset Directory setting is: one
 *  scope up, aimed at the folder rather than the root. */
export function FileEditor({
  directory,
  onSetDirectory,
  onBrowse,
}: {
  directory: string | undefined
  onSetDirectory: (dir: string) => void
  onBrowse: () => void
}): React.JSX.Element {
  return (
    <div className={s.configEditor}>
      <div className={s.configRow}>
        <span className={s.configLabel}>Directory</span>
        <PathField
          label="Directory"
          value={directory ?? ''}
          placeholder="Asset folder"
          onCommit={onSetDirectory}
          onBrowse={onBrowse}
        />
      </div>
    </div>
  )
}
