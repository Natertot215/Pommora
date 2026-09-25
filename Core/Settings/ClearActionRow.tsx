import { Button } from '@pommora/uix/Buttons/Button'
import { SettingsFieldRow } from './SettingsFieldRow'
import { useTimedLabel } from './useTimedLabel'

export function ClearActionRow({
  label,
  hint,
  clear,
}: {
  label: string
  hint?: string
  clear: () => Promise<boolean>
}): React.JSX.Element {
  const [buttonLabel, mark] = useTimedLabel('Clear', 'Cleared')
  const run = async (): Promise<void> => {
    if (await clear()) mark()
  }
  return (
    <SettingsFieldRow label={label} hint={hint}>
      <Button type="destructive" label={buttonLabel} onClick={() => void run()} />
    </SettingsFieldRow>
  )
}
