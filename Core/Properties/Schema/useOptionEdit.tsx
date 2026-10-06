import { useEffect, useRef, useState } from 'react'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { Reveal } from '@pommora/uix/Animations/Reveal'
import { useEntrance } from '@pommora/uix/Animations/useEntrance'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { base } from '@pommora/uix/Fields/fields.css'
import { labelColor, shape } from '@pommora/uix/Labels/label-base.css'
import { optionShapeFor } from '@pommora/uix/Labels/recipes'
import { colorNameFor } from '@pommora/uix/Theme/ramp'
import { cx } from '@pommora/uix/Utilities/cx'
import type { ColumnStyle } from '../columnStyles'
import type { OptionEdit } from '../optionModel'
import type { PropertyDefinition } from '../properties'
import type { OptionChipData } from '../Cells/OptionChip'
import { retryOwed, warnOwed, write } from '../propertyWrite'
import { dialer } from '../../Platform/dialer'
import { popMenu } from '../../Actions/menuActions'
import { optionMenuModel } from '../../Actions/optionMenu'
import { parseStyleAction } from '../../Actions/columnMenu'
import { askClearOption, askRemoveOption } from '../../Interface/Confirm/confirmations'
import { reportRefusal } from '../../Interface/Notifications/notifications'
import { OptionEditPopup } from './OptionEditPopup'

export type OptionStyleControl = {
  current: ColumnStyle
  set: (key: keyof ColumnStyle & string, value: string) => void
}

export type OptionDef = Pick<PropertyDefinition, 'id' | 'type' | 'status_groups'>

type Editing = { row: string; value: string }
type Draft = { groupId: string; index?: number }

export type OptionEditApi = {
  keyOf: (value: string) => string
  entering: (value: string) => boolean
  isOpen: (row: string) => boolean
  toggle: (value: string, anchor: HTMLElement) => void
  openMenu: (value: string, row: HTMLElement) => Promise<void>
  editOption: (edit: OptionEdit) => Promise<void>
  draft: Draft | null
  beginDraft: (groupId: string, index?: number) => void
  commitDraft: (title: string) => void
  cancelDraft: () => void
  busy: boolean
  popup: React.JSX.Element | null
}

export function useOptionEdit({
  def,
  options,
  style,
}: {
  def: OptionDef
  options: readonly OptionChipData[]
  style?: OptionStyleControl
}): OptionEditApi {
  const [editing, setEditing] = useState<Editing | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  const alias = useRef(new Map<string, { key: string; seen: boolean }>())
  const values = new Set(options.map((o) => o.value))
  for (const [title, entry] of alias.current) {
    if (values.has(title)) entry.seen = true
    else if (entry.seen && title !== editing?.value) alias.current.delete(title)
  }

  const editOption = (edit: OptionEdit): Promise<void> =>
    write(dialer().ask('property:editOption', def.id, edit))
  const keyOf = (value: string): string => {
    const key = alias.current.get(value)?.key
    return key !== undefined && !values.has(key) ? key : value
  }
  const enteringKey = useEntrance(options, (o) => keyOf(o.value))
  const entering = (value: string): boolean => enteringKey(keyOf(value))
  const isOpen = (row: string): boolean => editing !== null && keyOf(row) === keyOf(editing.row)
  const open = (value: string, el: HTMLElement): void => {
    anchor.current = el
    setEditing({ row: value, value })
  }
  const toggle = (value: string, el: HTMLElement): void =>
    isOpen(value) ? setEditing(null) : open(value, el)

  const rename = async (title: string): Promise<void> => {
    if (!editing || title === editing.value) return
    const { row, value: from } = editing
    alias.current.set(title, { key: keyOf(row), seen: false })
    setEditing((e) => (e && e.value === from ? { row: e.row, value: title } : e))
    const r = await dialer().ask('property:renameOption', def.id, from, title)
    if (!r.ok) {
      alias.current.delete(title)
      setEditing((e) => (e && e.value === title ? { row: e.row, value: from } : e))
    }
    if (reportRefusal(r)) retryOwed(r.value)
  }

  const openMenu = async (value: string, row: HTMLElement): Promise<void> => {
    const action = await popMenu(
      optionMenuModel(style && { type: def.type, current: style.current }),
    )
    switch (action) {
      case null:
        return
      case 'option:edit':
        return open(value, row)
      case 'option:clear':
        if (await askClearOption(value))
          await write(dialer().ask('property:clearOption', def.id, value))
        return
      case 'option:remove':
        if (await askRemoveOption(value))
          await warnOwed(dialer().ask('property:removeOption', def.id, value))
        return
      default: {
        const picked = parseStyleAction(action)
        if (picked) style?.set(picked.key, picked.value)
      }
    }
  }

  const commitDraft = (title: string): void => {
    if (!draft) return
    setDraft(null)
    void editOption({ op: 'add', groupId: draft.groupId, title, atIndex: draft.index })
  }

  const option = editing && options.find((o) => keyOf(o.value) === keyOf(editing.row))
  useEffect(() => {
    if (editing && !option) setEditing(null)
  }, [editing, option])
  const held = useHeld(editing && option ? { ...editing, option } : null, !!option)
  const popup = held ? (
    <OptionEditPopup
      open={!!option}
      contentKey={held.value}
      type={def.type}
      option={{ ...held.option, value: held.value }}
      def={def}
      triggerRef={anchor}
      onDismiss={() => setEditing(null)}
      onRename={(title) => void rename(title)}
      onPickIcon={(icon) => void editOption({ op: 'icon', value: held.value, icon })}
      onPickColor={(color) => void editOption({ op: 'recolor', value: held.value, color })}
      onPickAppearance={(appearance) =>
        void editOption({ op: 'appearance', value: held.value, appearance })
      }
    />
  ) : null

  return {
    keyOf,
    entering,
    isOpen,
    toggle,
    openMenu,
    editOption,
    draft,
    beginDraft: (groupId, index) => setDraft({ groupId, index }),
    commitDraft,
    cancelDraft: () => setDraft(null),
    busy: editing !== null || draft !== null,
    popup,
  }
}

export function OptionDraft({
  edit,
  type,
  color,
}: {
  edit: OptionEditApi
  type: string
  color?: string
}): React.JSX.Element {
  return (
    <Reveal open enterOnMount fill>
      <span className={cx(shape[optionShapeFor(type)], labelColor[colorNameFor(color)])}>
        <RenamableLabel
          renames="title"
          editing
          value=""
          className={base}
          autoSize
          onCommit={edit.commitDraft}
          onCancel={edit.cancelDraft}
        />
      </span>
    </Reveal>
  )
}
