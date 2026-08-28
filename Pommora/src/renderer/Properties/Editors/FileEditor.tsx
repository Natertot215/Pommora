import { PathField } from '@renderer/DesignSystem/Fields'
import { useSession } from '@renderer/store'
import { MenuIndex } from '@renderer/DesignSystem/Menus'
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
  return (
    <div className={s.configEditor}>
      <MenuIndex
        sections={[
          {
            rows: [
              {
                kind: 'item',
                inert: true,
                label: 'Directory',
                trailing: {
                  kind: 'field',
                  children: (
                    <PathField
                      label="Directory"
                      value={directory ?? ''}
                      empty={assetRoot}
                      onCommit={onSetDirectory}
                      onBrowse={onBrowse}
                    />
                  ),
                },
              },
            ],
          },
        ]}
      />
    </div>
  )
}
