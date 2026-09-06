import { PathField } from '@pommora/uix/Fields/PathField'
import { MenuRowView } from '@pommora/uix/Menus'
import { useSession } from '../Session/store'
import { host } from '../Platform/dialer'

export function AssetDirectoryRow({
  label,
  hint,
}: {
  label: string
  hint?: string
}): React.JSX.Element {
  const stored = useSession((s) => s.tree?.assetDirectory ?? '')
  const setAssetDirectory = useSession((s) => s.setAssetDirectory)

  return (
    <MenuRowView
      row={{
        kind: 'item',
        label,
        caption: hint,
        trailing: {
          kind: 'field',
          children: (
            <PathField
              label={label}
              value={stored}
              empty="No folder"
              onCommit={(next) => void setAssetDirectory(next)}
              onBrowse={() =>
                void host()
                  .ask('assets:chooseDir')
                  .then((picked) => {
                    if (picked.ok && picked.value !== null) void setAssetDirectory(picked.value)
                  })
              }
            />
          ),
        },
      }}
    />
  )
}
