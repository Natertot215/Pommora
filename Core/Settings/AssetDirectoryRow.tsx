import { reportRefusal } from '../Interface/Notifications/notifications'
import { PathField } from '@pommora/uix/Fields/PathField'
import { MenuRowView } from '@pommora/uix/Menus'
import { type RowOf, settingsRow } from './frames'
import { useSession } from '../Session/store'
import { dialer } from '../Platform/dialer'

export function AssetDirectoryRow({ row }: { row: RowOf<'path'> }): React.JSX.Element {
  const stored = useSession((s) => s.tree?.config.assetDirectory ?? '')
  const setDir = (dir: string): void => void dialer().ask('assets:setDir', dir).then(reportRefusal)
  const browse = (): void =>
    void dialer()
      .ask('assets:chooseDir')
      .then((picked) => {
        if (reportRefusal(picked, browse) && picked.value !== null) setDir(picked.value)
      })

  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'field',
        children: (
          <PathField
            label={row.label}
            value={stored}
            empty="No folder"
            onCommit={setDir}
            onBrowse={browse}
          />
        ),
      })}
    />
  )
}
