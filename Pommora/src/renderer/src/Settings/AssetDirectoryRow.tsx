// The Default Asset Directory setting — a folder path in a bordered field, pointed at the nexus.
import { Button } from '@renderer/DesignSystem/Components/Controls/Button'
import { InputField, placeholder } from '@renderer/DesignSystem/Components/Fields'
import { NavTrail, pathSegments } from '@renderer/DesignSystem/Elements/NavTrail'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { useSession } from '../store'
import { SettingsRow, type RowText } from './SettingsRow'

export function AssetDirectoryRow({ label, hint }: RowText): React.JSX.Element {
  const stored = useSession((s) => s.tree?.assetDirectory ?? '')
  const setAssetDirectory = useSession((s) => s.setAssetDirectory)
  const segments = pathSegments(stored)

  return (
    <SettingsRow label={label} hint={hint}>
      <InputField
        chrome="bordered"
        label={label}
        edit={{
          value: stored,
          onCommit: (next) => void setAssetDirectory(next),
          renames: 'row',
          emptyCommits: true,
        }}
        leading={<Icon name="folder-closed" size="body" />}
        trailing={
          <Button
            type="base"
            size="button-inline"
            icon="folder-open"
            aria-label="Choose Folder"
            onClick={(e) => {
              e.stopPropagation()
              void window.nexus.chooseAssetDir().then((picked) => {
                if (picked.ok && picked.value !== null) void setAssetDirectory(picked.value)
              })
            }}
          />
        }
      >
        {segments.length > 0 ? (
          <NavTrail segments={segments} />
        ) : (
          <span className={placeholder}>No folder</span>
        )}
      </InputField>
    </SettingsRow>
  )
}
