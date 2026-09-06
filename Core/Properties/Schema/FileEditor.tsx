import { PathField } from '@pommora/uix/Fields/PathField'
import { useSession } from '../../Session/store'
import { MenuIndex } from '@pommora/uix/Menus'
import * as s from '@pommora/uix/Menus/frames.css'

/** Relative to the asset root rather than to the nexus, so re-pointing the root carries it along. */
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
