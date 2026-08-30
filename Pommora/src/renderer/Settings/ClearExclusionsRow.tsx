import { useState } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { MenuRowView } from '@renderer/DesignSystem/Menus'

export function ClearExclusionsRow({
  label,
  hint,
}: {
  label: string
  hint: string
}): React.JSX.Element {
  const [done, setDone] = useState(false)
  const clear = (): void => {
    void window.nexus.clearExclusions().then((r) => {
      if (!r.ok) {
        void window.nexus.showError(r.error.message)
        return
      }
      // A report means a clear ran; null is a cancelled dialog or an empty list.
      if (r.value === null) return
      setDone(true)
      window.setTimeout(() => setDone(false), 400)
    })
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
            <Button type="destructive" label={done ? 'Cleared' : 'Clear'} onClick={clear} />
          ),
        },
      }}
    />
  )
}
