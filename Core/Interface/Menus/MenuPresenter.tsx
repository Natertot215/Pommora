import { useRef, useState } from 'react'
import type { ActionItem } from '@pommora/core/Actions/menuModel'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { FrameSlide } from '@pommora/uix/Menus/frame-slide'
import { MenuItem, MenuScrollFrame, MenuSeparator, MenuTopRow } from '@pommora/uix/Menus'
import { PickerMenu, PickerRow } from '@pommora/uix/Pickers/picker-base'
import { PICKER_MAX_HEIGHT } from '@pommora/uix/Pickers/picker-base.css'
import { Icon } from '@pommora/uix/Symbols'
import { useSession } from '../../Session/store'
import { menuRows, type PresenterRow } from './menuRows'

const GLYPH = 12
const CHEVRON = <Icon name="chevron-right" size={GLYPH} />
const leadingGlyph = (icon?: string): React.JSX.Element | undefined =>
  icon ? <Icon name={icon} size={GLYPH} /> : undefined

function Level({
  items,
  title,
  onBack,
  onPick,
  compact,
}: {
  items: readonly ActionItem<string>[]
  title: string
  onBack?: { label: string; back: () => void }
  onPick: (action: string, stay?: boolean) => void
  compact?: boolean
}): React.JSX.Element {
  const [branchAt, setBranchAt] = useState<number | null>(null)
  const rows = menuRows(items)
  const at = branchAt === null ? undefined : rows[branchAt]
  const branch =
    at?.kind === 'item' && at.submenu ? { label: at.label, items: at.submenu } : undefined
  const renderRow = (row: PresenterRow<string>, i: number): React.JSX.Element => {
    switch (row.kind) {
      case 'separator':
        return <MenuSeparator key={`separator-${String(i)}`} />
      case 'choice':
        return (
          <PickerRow
            key={`${row.label}-${String(i)}`}
            ring
            align="start"
            selected={row.checked}
            leading={leadingGlyph(row.icon)}
            disabled={row.disabled}
            onClick={() => onPick(row.action, row.stay)}
          >
            <span className={overScrollEllipsis}>{row.label}</span>
          </PickerRow>
        )
      case 'item': {
        const { submenu } = row
        return (
          <MenuItem
            key={`${row.label}-${String(i)}`}
            disabled={row.disabled}
            leading={leadingGlyph(row.icon)}
            trailing={submenu ? CHEVRON : undefined}
            onClick={submenu ? () => setBranchAt(i) : () => onPick(row.action, row.stay)}
          >
            {row.label}
          </MenuItem>
        )
      }
    }
  }
  return (
    <FrameSlide
      open={branch !== undefined}
      minWidth={compact ? undefined : 120}
      maxWidth={compact ? undefined : 180}
      root={
        <MenuScrollFrame
          maxHeight={PICKER_MAX_HEIGHT}
          header={
            onBack && <MenuTopRow label={onBack.label} current={title} onBack={onBack.back} />
          }
        >
          {rows.map(renderRow)}
        </MenuScrollFrame>
      }
      detail={
        branch && (
          <Level
            items={branch.items}
            title={branch.label}
            onBack={{ label: title, back: () => setBranchAt(null) }}
            onPick={onPick}
            compact={compact}
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
  const [live, setLive] = useState<{ id: number; items: readonly ActionItem<string>[] } | null>(
    null,
  )
  const pick = (action: string, stay?: boolean): void => {
    if (!shown) return
    if (stay && shown.stay) setLive({ id: shown.id, items: shown.stay(action) })
    else shown.settle(action)
  }
  return (
    <PickerMenu
      open={pending !== null}
      onDismiss={() => pending?.settle(null)}
      triggerRef={triggerRef}
      origin="center"
      solid={shown?.solid}
    >
      {shown && (
        <Level
          key={shown.id}
          items={live && live.id === shown.id ? live.items : shown.items}
          title="Menu"
          onPick={pick}
          compact={shown.compact}
        />
      )}
    </PickerMenu>
  )
}
