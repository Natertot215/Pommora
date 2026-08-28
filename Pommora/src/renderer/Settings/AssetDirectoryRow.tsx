import { PathField } from '@renderer/DesignSystem/Components/Fields'
import { MenuRowView } from '@renderer/DesignSystem/Menus'
import { useSession } from '../store'

export function AssetDirectoryRow({
  label,
  hint,
}: {
  label: string
  hint: string
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
                void window.nexus.chooseAssetDir().then((picked) => {
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
