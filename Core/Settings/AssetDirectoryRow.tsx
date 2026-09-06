import { PathField } from '@pommora/uix/Fields/PathField'
import { SettingsFieldRow } from './SettingsFieldRow'
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
    <SettingsFieldRow label={label} hint={hint}>
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
    </SettingsFieldRow>
  )
}
