import { PathField } from '@renderer/DesignSystem/Components/Fields'
import { useSession } from '@renderer/store'
import { rowBox } from '@renderer/DesignSystem/Menus/menu-base.css'
import * as s from '../../Frames/frames.css'

/** The path is relative to the asset root rather than to the nexus, so re-pointing the root
 *  carries it along. */
export function FileEditor({
  directory,
  onSetDirectory,
  onBrowse,
}: {
  directory: string | undefined
  onSetDirectory: (dir: string) => void
  onBrowse: () => void
}): React.JSX.Element {
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
