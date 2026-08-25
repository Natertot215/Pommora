import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { InputField, placeholder } from '@renderer/DesignSystem/Components/Fields'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { useSession } from '@renderer/store'
import * as s from './settingsPane.css'

/** Where this property's uploads land — the asset directory itself by default, or a subfolder
 *  beneath it. Def-level (property-wide), like a link's color or a number's format. The path is
 *  relative to the asset root rather than to the nexus, so re-pointing the root carries it along.
 *
 *  The same field the Default Asset Directory setting is: one scope up, aimed at the folder
 *  rather than the root. */
export function FileEditor({
  directory,
  onSetDirectory,
  onBrowse,
}: {
  directory: string | undefined
  onSetDirectory: (dir: string) => void
  onBrowse: () => void
}): React.JSX.Element {
  // Unset means the asset root itself, so the field names that root rather than a generic word —
  // the folder a file actually lands in is readable before anything is chosen.
  const assetRoot = useSession((st) => st.tree?.assetDirectory ?? '')
  const value = directory ?? ''
  const segments = value
    .split('/')
    .filter(Boolean)
    .map((title) => ({ title, icon: 'folder-closed' }))
  return (
    <div className={s.configEditor}>
      <div className={s.configRow}>
        <span className={s.configLabel}>Directory</span>
        <InputField
          chrome="bordered"
          label="Directory"
          edit={{ value, onCommit: onSetDirectory }}
          trailing={
            <Button
              type="base"
              size="button-inline"
              icon="folder-open"
              aria-label="Choose Folder"
              onClick={(e) => {
                e.stopPropagation()
                onBrowse()
              }}
            />
          }
        >
          {segments.length > 0 ? (
            <NavTrail segments={segments} />
          ) : (
            <span className={placeholder}>{assetRoot}</span>
          )}
        </InputField>
      </div>
    </div>
  )
}
