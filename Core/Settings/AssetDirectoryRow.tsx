import { reportRefusal } from '@pommora/core/Interface/Notifications/notifications'
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
  const setDir = (dir: string): void => void host().ask('assets:setDir', dir).then(reportRefusal)

  return (
    <SettingsFieldRow label={label} hint={hint}>
      <PathField
        label={label}
        value={stored}
        empty="No folder"
        onCommit={setDir}
        onBrowse={() =>
          void host()
            .ask('assets:chooseDir')
            .then((picked) => {
              if (reportRefusal(picked) && picked.value !== null) setDir(picked.value)
            })
        }
      />
    </SettingsFieldRow>
  )
}
