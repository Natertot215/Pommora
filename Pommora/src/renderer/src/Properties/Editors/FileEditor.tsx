import { PathField } from '@renderer/DesignSystem/Components/Fields'
import { useSession } from '@renderer/store'
import { rowBox } from '@renderer/DesignSystem/Menus/menu-base.css'
import * as s from '../../Frames/frames.css'

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
  return (
    <div className={s.configEditor}>
      <div className={rowBox}>
        <span className={s.configLabel}>Directory</span>
        <PathField
          label="Directory"
          value={value}
          empty={assetRoot}
          onCommit={onSetDirectory}
          onBrowse={onBrowse}
        />
      </div>
    </div>
  )
}
