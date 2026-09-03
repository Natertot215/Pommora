import { useEffect, useRef, useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { MenuRowView } from '@renderer/DesignSystem/Menus'

const CLEARED_MS = 1500

/** A destructive Clear that reads Cleared for a moment once `clear` reports it ran. */
export function ClearActionRow({
  label,
  hint,
  clear,
}: {
  label: string
  hint: string
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
    <MenuRowView
      row={{
        kind: 'item',
        label,
        caption: hint,
        trailing: {
          kind: 'field',
          children: (
            <Button
              type="destructive"
              label={done ? 'Cleared' : 'Clear'}
              onClick={() => void run()}
            />
          ),
        },
      }}
    />
  )
}
