import { useEffect, useRef, useState } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { titleInput } from '@pommora/uix/Menus/menu-row.css'
import type { ColumnStyle } from '../columnStyles'
import type { OptionEdit } from '../optionModel'
import type { PropertyDefinition, PropertyType } from '../properties'
import type { OptionChipData } from '../Cells/OptionChip'
import { warnOwed, write } from '../propertyWrite'
import { normalizeTitle } from '../../Paths/caseFold'
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
  entering: (key: string) => boolean
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
  for (const [title] of alias.current)
    if (!values.includes(title) && title !== editing?.value) alias.current.delete(title)

  const editOption = (edit: OptionEdit): Promise<void> =>
    write(dialer().ask('property:editOption', propertyId, edit))
  const keyOf = (value: string): string => {
    const key = alias.current.get(value)
    return key !== undefined && !values.includes(key) ? key : value
  }
  const entering = useEntrance(options, (o) => keyOf(o.value))
  const isOpen = (row: string): boolean => editing !== null && keyOf(row) === keyOf(editing.row)
  const open = (value: string, el: HTMLElement): void => {
    anchor.current = el
    setEditing({ row: value, value })
  }
  const toggle = (value: string, el: HTMLElement): void =>
    isOpen(value) ? setEditing(null) : open(value, el)

  const rename = (title: string): void => {
    if (!editing || title === editing.value) return
    const { row, value: from } = editing
    const taken = values.some((v) => v !== from && normalizeTitle(v) === normalizeTitle(title))
    if (title === row || !taken) {
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

  const option = editing && options.find((o) => keyOf(o.value) === keyOf(editing.row))
  useEffect(() => {
    if (editing && !option) setEditing(null)
  }, [editing, option])
  const held = useHeld(editing && option ? { ...editing, option } : null, !!option)
  const popup = held ? (
    <OptionEditPopup
      open={!!option}
      contentKey={held.row}
      type={type}
      option={held.option}
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

  return { keyOf, entering, isOpen, toggle, openMenu, editOption, busy: editing !== null, popup }
}

export function OptionDraft({
  onCommit,
  onCancel,
}: {
  onCommit: (title: string) => void
  onCancel: () => void
}): React.JSX.Element {
  return (
    <Reveal open enterOnMount fill>
      <RenamableLabel
        renames="title"
        editing
        value=""
        className={titleInput}
        autoSize
        onCommit={onCommit}
        onCancel={onCancel}
      />
    </Reveal>
  )
}
