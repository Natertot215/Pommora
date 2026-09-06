import { useState } from 'react'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { useHeld } from '@pommora/uix/Animations/useHeld'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { MenuIndex, MenuTopRow } from '@pommora/uix/Menus'
import { PickerMenu } from '@pommora/uix/Pickers/picker-base'
import { useSession } from '../../Session/store'
import { rowMenuRows } from './rowMenuRows'

function Level({
  items,
  title,
  onBack,
  onPick,
}: {
  items: readonly ActionItem<string>[]
  title: string
  onBack?: { label: string; back: () => void }
  onPick: (action: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState<ActionItem<string> | null>(null)
  return (
    <FrameSlide
      open={open !== null}
      root={
        <>
          {onBack && <MenuTopRow label={onBack.label} current={title} onBack={onBack.back} />}
          <MenuIndex sections={[{ rows: rowMenuRows(items, onPick, setOpen) }]} />
        </>
      }
      detail={
        open?.submenu && (
          <Level
            items={open.submenu}
            title={open.label}
            onBack={{ label: title, back: () => setOpen(null) }}
            onPick={onPick}
          />
        )
      }
    />
  )
}

/** One mounted pane for every list menu the host has no native popper for; the request lives in the store the way a confirmation does. */
export function RowMenuHost(): React.JSX.Element {
  const pending = useSession((st) => st.pendingRowMenu)
  // Held through the Bloom-out, so the pane keeps drawing the rows it was dismissed with.
  const shown = useHeld(pending, pending !== null)
  return (
    <PickerMenu
      open={pending !== null}
      onDismiss={() => pending?.settle(null)}
      anchorX={shown?.at.left}
      anchorY={shown?.at.top}
      anchorHeight={shown?.at.height}
      origin="left"
    >
      {shown && (
        <Level key={shown.id} items={shown.items} title="Menu" onPick={(a) => shown.settle(a)} />
      )}
    </PickerMenu>
  )
}
