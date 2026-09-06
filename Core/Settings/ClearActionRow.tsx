import { useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { SettingsFieldRow } from './SettingsFieldRow'

const CLEARED_MS = 1500

export function ClearActionRow({
  label,
  hint,
  clear,
}: {
  label: string
  hint?: string
  clear: () => Promise<boolean>
}): React.JSX.Element {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const run = async (): Promise<void> => {
    if (!(await clear())) return
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), CLEARED_MS)
  }
  return (
    <SettingsFieldRow label={label} hint={hint}>
      <Button type="destructive" label={done ? 'Cleared' : 'Clear'} onClick={() => void run()} />
    </SettingsFieldRow>
  )
}
