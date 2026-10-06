import { useRef, useState } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import type { ColumnStyle } from '../columnStyles'
import type { OptionEdit } from '../optionModel'
import type { PropertyDefinition, PropertyType } from '../properties'
import type { OptionChipData } from '../Cells/OptionChip'
import { warnOwed, write } from '../propertyWrite'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '../../Actions/optionMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { askClearOption, askRemoveOption } from '../../Interface/Confirm/confirmations'
import { OptionEditPopup } from './OptionEditPopup'

export type OptionStyleControl = {
  current: ColumnStyle
  set: (key: keyof ColumnStyle & string, value: string) => void
}

type Editing = { row: string; value: string }

export function useOptionEdit({
  propertyId,
  type,
  def,
  options,
  style,
}: {
  propertyId: string
  type: PropertyType
  def?: Pick<PropertyDefinition, 'status_groups'>
  options: readonly OptionChipData[]
  style?: OptionStyleControl
}): {
  keyOf: (value: string) => string
  isOpen: (row: string) => boolean
  toggle: (value: string, anchor: HTMLElement) => void
  openMenu: (value: string, row: HTMLElement) => Promise<void>
  editOption: (edit: OptionEdit) => Promise<void>
  busy: boolean
  popup: React.JSX.Element | null
} {
  const [editing, setEditing] = useState<Editing | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const alias = useRef(new Map<string, string>())
  const values = options.map((o) => o.value)

  const editOption = (edit: OptionEdit): Promise<void> =>
    write(dialer().ask('property:editOption', propertyId, edit))
  const keyOf = (value: string): string => {
    const key = alias.current.get(value)
    return key !== undefined && !values.includes(key) ? key : value
  }
  const isOpen = (row: string): boolean =>
    editing !== null &&
    (editing.value === row || (editing.row === row && !values.includes(editing.value)))
  const open = (value: string, el: HTMLElement): void => {
    anchor.current = el
    setEditing({ row: value, value })
  }
  const toggle = (value: string, el: HTMLElement): void =>
    isOpen(value) ? setEditing(null) : open(value, el)

  const rename = (title: string): void => {
    if (!editing || title === editing.value) return
    const { row, value: from } = editing
    if (title === row || !values.includes(title)) {
      alias.current.set(title, keyOf(row))
      setEditing((e) => (e && e.value === from ? { row: e.row, value: title } : e))
    }
    void warnOwed(dialer().ask('property:renameOption', propertyId, from, title))
  }

  const openMenu = async (value: string, row: HTMLElement): Promise<void> => {
    const action = await popMenu(optionMenuModel(style && { type, current: style.current }))
    switch (action) {
      case null:
        return
      case 'option:edit':
        return open(value, row)
      case 'option:clear':
        if (await askClearOption(value))
          await write(dialer().ask('property:clearOption', propertyId, value))
        return
      case 'option:remove':
        if (await askRemoveOption(value))
          await warnOwed(dialer().ask('property:removeOption', propertyId, value))
        return
      default: {
        const picked = parseStyleAction(action)
        if (picked) style?.set(picked.key, picked.value)
      }
    }
  }

  const held = useHeld(editing, editing !== null)
  const option =
    held &&
    (options.find((o) => o.value === held.value) ?? options.find((o) => o.value === held.row))
  const popup =
    held && option ? (
      <OptionEditPopup
        open={editing !== null}
        contentKey={held.row}
        type={type}
        option={option}
        def={def}
        triggerRef={anchor}
        onDismiss={() => setEditing(null)}
        onRename={rename}
        onPickIcon={(icon) => void editOption({ op: 'icon', value: held.value, icon })}
        onPickColor={(color) => void editOption({ op: 'recolor', value: held.value, color })}
        onPickAppearance={(appearance) =>
          void editOption({ op: 'appearance', value: held.value, appearance })
        }
      />
    ) : null

  return { keyOf, isOpen, toggle, openMenu, editOption, busy: editing !== null, popup }
}
