import { Button } from '@pommora/uix/Buttons/Button'
import { useTimedLabel } from '@pommora/uix/Animations/useTimedLabel'
import { MenuRowView } from '@pommora/uix/Menus'
import { type RowOf, settingsRow } from './frames'

export function ClearActionRow({ row }: { row: RowOf<'clear'> }): React.JSX.Element {
  const [buttonLabel, mark] = useTimedLabel('Clear', 'Cleared')
  const run = async (): Promise<void> => {
    if (await row.clear()) mark()
  }
  return (
    <MenuRowView
      row={settingsRow(row, {
        kind: 'field',
        children: <Button type="destructive" label={buttonLabel} onClick={() => void run()} />,
      })}
    />
  )
}
