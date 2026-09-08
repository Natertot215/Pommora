import { useRef, useState } from 'react'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { MenuItem, MenuScrollFrame, MenuSeparator, MenuTopRow } from '@pommora/uix/Menus'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { Icon } from '@pommora/uix/Symbols'
import { useSession } from '../../Session/store'
import { menuRows } from './menuRows'

const GLYPH = 12
const CHEVRON = <Icon name="chevron-right" size={GLYPH} />
const leadingGlyph = (icon?: string): React.JSX.Element | undefined =>
  icon ? <Icon name={icon} size={GLYPH} /> : undefined

type Branch = { title: string; items: readonly ActionItem<string>[] }

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
  const [branch, setBranch] = useState<Branch | null>(null)
  return (
    <FrameSlide
      open={branch !== null}
      root={
        <MenuScrollFrame
          maxHeight={PICKER_MAX_HEIGHT}
          header={
            onBack && <MenuTopRow label={onBack.label} current={title} onBack={onBack.back} />
          }
        >
          {menuRows(items).map((row, i) =>
            row.kind === 'separator' ? (
              <MenuSeparator key={`separator-${String(i)}`} />
            ) : row.kind === 'choice' ? (
              <PickerRow
                key={`${row.label}-${String(i)}`}
                ring
                align="start"
                selected={row.checked}
                leading={leadingGlyph(row.icon)}
                onClick={row.disabled ? undefined : () => onPick(row.action)}
              >
                {row.label}
              </PickerRow>
            ) : (
              <MenuItem
                key={`${row.label}-${String(i)}`}
                disabled={row.disabled}
                leading={leadingGlyph(row.icon)}
                trailing={row.submenu ? CHEVRON : undefined}
                onClick={
                  row.submenu
                    ? () => setBranch({ title: row.label, items: row.submenu ?? [] })
                    : () => onPick(row.action)
                }
              >
                {row.label}
              </MenuItem>
            ),
          )}
        </MenuScrollFrame>
      }
      detail={
        branch && (
          <Level
            items={branch.items}
            title={branch.title}
            onBack={{ label: title, back: () => setBranch(null) }}
            onPick={onPick}
          />
        )
      }
    />
  )
}

export function MenuPresenter(): React.JSX.Element {
  const pending = useSession((st) => st.pendingMenu)
  const shown = useHeld(pending, pending !== null)
  const triggerRef = useRef<HTMLElement | null>(null)
  triggerRef.current = shown?.trigger ?? null
  return (
    <PickerMenu
      open={pending !== null}
      onDismiss={() => pending?.settle(null)}
      triggerRef={triggerRef}
      origin="center"
    >
      {shown && (
        <Level key={shown.id} items={shown.items} title="Menu" onPick={(a) => shown.settle(a)} />
      )}
    </PickerMenu>
  )
}
