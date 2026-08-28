import { PathField } from '@renderer/DesignSystem/Components/Fields'
import { useSession } from '../store'
import { SettingsRow, type RowText } from './SettingsRow'

export function AssetDirectoryRow({ label, hint }: RowText): React.JSX.Element {
  const stored = useSession((s) => s.tree?.assetDirectory ?? '')
  const setAssetDirectory = useSession((s) => s.setAssetDirectory)

  return (
    <SettingsRow label={label} hint={hint}>
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
    </SettingsRow>
  )
}
