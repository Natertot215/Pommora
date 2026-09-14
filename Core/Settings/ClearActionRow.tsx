import { useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { SettingsFieldRow } from './SettingsFieldRow'

const CLEARED_MS = 1500

export function useTimedLabel(idle: string, active: string): [string, () => void] {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const mark = (): void => {
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), CLEARED_MS)
  }
  return [done ? active : idle, mark]
}

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
