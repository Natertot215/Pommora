// The Default Asset Directory setting — the house path field, pointed at the nexus.
import { PathField } from '@renderer/design-system/components/PathField'
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
        onCommit={(next) => void setAssetDirectory(next)}
        onBrowse={() => {
          void window.nexus.chooseAssetDir().then((picked) => {
            if (picked.ok && picked.value !== null) void setAssetDirectory(picked.value)
          })
        }}
      />
    </SettingsRow>
  )
}
