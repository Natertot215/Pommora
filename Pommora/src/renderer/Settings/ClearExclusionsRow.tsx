import { useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { MenuRowView } from '@renderer/DesignSystem/Menus'
import { askClearExclusions } from '@renderer/Windows/confirmations'

export function ClearExclusionsRow({
  label,
  hint,
}: {
  label: string
  hint: string
}): React.JSX.Element {
  const [done, setDone] = useState(false)
  const clear = async (): Promise<void> => {
    const count = await window.nexus.countExclusions()
    if (!count.ok) return void window.nexus.showError(count.error.message)
    if (count.value === 0 || !(await askClearExclusions(count.value))) return
    const r = await window.nexus.clearExclusions()
    if (!r.ok) return void window.nexus.showError(r.error.message)
    // A report means a clear ran; null is an emptied list.
    if (r.value === null) return
    setDone(true)
    window.setTimeout(() => setDone(false), 1500)
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
              onClick={() => void clear()}
            />
          ),
        },
      }}
    />
  )
}
